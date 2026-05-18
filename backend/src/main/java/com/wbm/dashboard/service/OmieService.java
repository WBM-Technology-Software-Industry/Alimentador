package com.wbm.dashboard.service;

import com.wbm.dashboard.config.OmieConfig;
import com.wbm.dashboard.dto.omie.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OmieService {

    private final RestTemplate restTemplate;
    private final OmieConfig omieConfig;
    private final PedidoService pedidoService;

    private static final String ETAPA_SEPARAR_ESTOQUE = "20";
    private static final String ETAPA_FATURAR         = "50";
    private static final String ETAPA_FATURADO        = "60";
    private static final int REGISTROS_POR_PAGINA = 50;
    private static final Duration CACHE_TTL = Duration.ofMinutes(1);

    private volatile List<ClienteOmie> clientesCache;
    private volatile Instant clientesCachedAt = Instant.EPOCH;

    private volatile List<PedidoVenda> pedidosCache;
    private volatile Instant pedidosCachedAt = Instant.EPOCH;

    private volatile List<OpDTO> opsCache;
    private volatile Instant opsCachedAt = Instant.EPOCH;

    public List<PedidoSeparacaoDTO> buscarPedidosSeparacao() {
        List<PedidoVenda> pedidosFiltrados = buscarTodosPedidos().stream()
                .filter(p -> p.getCabecalho() != null)
                .filter(p -> p.getInfoCadastro() != null)
                .filter(p -> "N".equals(p.getInfoCadastro().getCancelado()))
                .filter(p -> {
                    String etapa = p.getCabecalho().getEtapa();
                    return ETAPA_SEPARAR_ESTOQUE.equals(etapa)
                        || ETAPA_FATURAR.equals(etapa)
                        || ETAPA_FATURADO.equals(etapa);
                })
                .collect(Collectors.toList());

        Map<Long, String> clientes = buscarMapaClientes();

        List<PedidoSeparacaoDTO> result = pedidosFiltrados.stream()
                .map(p -> montarDTO(p, clientes))
                .collect(Collectors.toList());

        result.stream()
                .filter(d -> "entregue".equals(d.getStatus()))
                .forEach(d -> {
                    try { pedidoService.syncEntregue(d); }
                    catch (Exception e) { log.warn("Falha ao salvar entregue {}: {}", d.getNumeroPedido(), e.getMessage()); }
                });

        return result;
    }

    private synchronized List<PedidoVenda> buscarTodosPedidos() {
        if (pedidosCache != null &&
                Duration.between(pedidosCachedAt, Instant.now()).compareTo(CACHE_TTL) < 0) {
            return pedidosCache;
        }

        List<PedidoVenda> todos = new ArrayList<>();
        int pagina = 1;

        while (true) {
            var filtro = PedidoFiltro.builder()
                    .pagina(pagina)
                    .registrosPorPagina(REGISTROS_POR_PAGINA)
                    .build();

            var request = OmieRequest.<PedidoFiltro>builder()
                    .call("ListarPedidos")
                    .appKey(omieConfig.getAppKey())
                    .appSecret(omieConfig.getAppSecret())
                    .param(List.of(filtro))
                    .build();

            ListarPedidosResponse response = chamarOmie(
                    omieConfig.getBaseUrl() + "/produtos/pedido/",
                    request,
                    ListarPedidosResponse.class
            );

            if (response == null || response.getPedidos() == null) break;
            todos.addAll(response.getPedidos());
            if (pagina >= response.getTotalDePaginas()) break;
            pagina++;
        }

        pedidosCache = todos;
        pedidosCachedAt = Instant.now();
        return todos;
    }

    public synchronized List<OpDTO> buscarOrdensProducao() {
        if (opsCache != null &&
                Duration.between(opsCachedAt, Instant.now()).compareTo(CACHE_TTL) < 0) {
            return opsCache;
        }

        List<OpDTO> result = new ArrayList<>();
        int pagina = 1;

        while (true) {
            var filtro = OPFiltro.builder()
                    .pagina(pagina)
                    .registrosPorPagina(REGISTROS_POR_PAGINA)
                    .exibirItens(false)
                    .build();

            var request = OmieRequest.<OPFiltro>builder()
                    .call("ListarOrdemProducao")
                    .appKey(omieConfig.getAppKey())
                    .appSecret(omieConfig.getAppSecret())
                    .param(List.of(filtro))
                    .build();

            ListarOPResponse response = chamarOmie(
                    omieConfig.getBaseUrl() + "/produtos/op/",
                    request,
                    ListarOPResponse.class
            );

            if (response == null || response.getCadastros() == null) break;

            response.getCadastros().forEach(op -> {
                var id = op.getIdentificacao();
                var inf = op.getInfAdicionais();
                var out = op.getOutrasInf();

                String status = "pendente";
                if (out != null && "S".equals(out.getCConcluida())) {
                    status = "concluido";
                } else if (inf != null && inf.getCEtapa() != null) {
                    status = switch (inf.getCEtapa()) {
                        case "20" -> "producao";
                        case "30" -> "concluido";
                        default   -> "pendente";
                    };
                }

                result.add(OpDTO.builder()
                        .id(id != null ? String.valueOf(id.getNCodOP()) : null)
                        .numero(id != null ? id.getCNumOP() : null)
                        .tipo("interno")
                        .item(id != null && id.getCCodIntProd() != null ? id.getCCodIntProd() : "")
                        .status(status)
                        .prioridade("media")
                        .responsavel(out != null ? out.getUInc() : "")
                        .setor("")
                        .abertura(out != null ? out.getDInclusao() : "")
                        .prevEntrega(id != null ? id.getDDtPrevisao() : "")
                        .linkedOrders(List.of())
                        .build());
            });

            if (pagina >= response.getTotalDePaginas()) break;
            pagina++;
        }

        opsCache = result;
        opsCachedAt = Instant.now();
        return result;
    }

    private synchronized List<ClienteOmie> buscarClientesRaw() {
        if (clientesCache != null &&
                Duration.between(clientesCachedAt, Instant.now()).compareTo(CACHE_TTL) < 0) {
            return clientesCache;
        }

        List<ClienteOmie> todos = new ArrayList<>();
        int pagina = 1;

        while (true) {
            var filtro = ClienteFiltro.builder()
                    .pagina(pagina)
                    .registrosPorPagina(REGISTROS_POR_PAGINA)
                    .build();

            var request = OmieRequest.<ClienteFiltro>builder()
                    .call("ListarClientes")
                    .appKey(omieConfig.getAppKey())
                    .appSecret(omieConfig.getAppSecret())
                    .param(List.of(filtro))
                    .build();

            ListarClientesResponse response = chamarOmie(
                    omieConfig.getBaseUrl() + "/geral/clientes/",
                    request,
                    ListarClientesResponse.class
            );

            if (response == null || response.getClientes() == null) break;
            todos.addAll(response.getClientes());
            if (pagina >= response.getTotalDePaginas()) break;
            pagina++;
        }

        clientesCache = todos;
        clientesCachedAt = Instant.now();
        return todos;
    }

    private Map<Long, String> buscarMapaClientes() {
        Map<Long, String> mapa = new HashMap<>();
        buscarClientesRaw().forEach(c -> {
            String nome = (c.getNomeFantasia() != null && !c.getNomeFantasia().isBlank())
                    ? c.getNomeFantasia()
                    : c.getRazaoSocial();
            mapa.put(c.getCodigoClienteOmie(), nome);
        });
        return mapa;
    }

    private PedidoSeparacaoDTO montarDTO(PedidoVenda pedido, Map<Long, String> clientes) {
        var cab = pedido.getCabecalho();

        List<String> itens = pedido.getDet() == null ? List.of() :
                pedido.getDet().stream()
                        .filter(d -> d.getProduto() != null)
                        .map(d -> d.getProduto().getDescricao())
                        .collect(Collectors.toList());

        String nomeCliente = clientes.getOrDefault(cab.getCodigoCliente(), "Cliente " + cab.getCodigoCliente());

        String dadosAdicionais = pedido.getAdicionais() != null
                ? pedido.getAdicionais().getDadosAdicionaisNf()
                : null;
        String numeroPedidoCliente = pedido.getAdicionais() != null
                ? pedido.getAdicionais().getNumeroPedidoCliente()
                : null;
        String etapa = cab.getEtapa();
        String status = ETAPA_FATURAR.equals(etapa) ? "concluido"
                      : ETAPA_FATURADO.equals(etapa) ? "entregue"
                      : "pendente";

        return PedidoSeparacaoDTO.builder()
                .numeroPedido(cab.getNumeroPedido())
                .numeroPedidoCliente(numeroPedidoCliente)
                .nomeCliente(nomeCliente)
                .itens(itens)
                .dataEntrada(pedido.getInfoCadastro().getDataInclusao())
                .dataPrazo(cab.getDataPrevisao())
                .status(status)
                .dadosAdicionais(dadosAdicionais)
                .build();
    }

    private <T, R> R chamarOmie(String url, OmieRequest<T> request, Class<R> responseType) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<OmieRequest<T>> entity = new HttpEntity<>(request, headers);

        ResponseEntity<R> response = restTemplate.exchange(url, HttpMethod.POST, entity, responseType);
        return response.getBody();
    }
}
