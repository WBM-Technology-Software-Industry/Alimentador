package com.wbm.dashboard.service;

import com.wbm.dashboard.dto.omie.PedidoSeparacaoDTO;
import com.wbm.dashboard.entity.Pedido;
import com.wbm.dashboard.entity.PedidoItem;
import com.wbm.dashboard.repository.PedidoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PedidoService {

    private final PedidoRepository pedidoRepository;

    private static final DateTimeFormatter FMT_BR  = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter FMT_ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    public List<Pedido> listarEntregues() {
        return pedidoRepository.findByStatus("entregue");
    }

    @Transactional
    public void syncEntregue(PedidoSeparacaoDTO dto) {
        if (pedidoRepository.existsByNumeroPedido(dto.getNumeroPedido())) return;

        Pedido pedido = Pedido.builder()
                .numeroPedido(dto.getNumeroPedido())
                .numeroPedidoCliente(dto.getNumeroPedidoCliente())
                .cliente(dto.getNomeCliente())
                .status("entregue")
                .prioridade("media")
                .dataEntrada(parseDate(dto.getDataEntrada()))
                .dataPrazo(parseDate(dto.getDataPrazo()))
                .dadosAdicionais(dto.getDadosAdicionais())
                .build();

        if (dto.getItens() != null) {
            List<PedidoItem> items = dto.getItens().stream()
                    .map(desc -> PedidoItem.builder()
                            .name(desc)
                            .quantity(1)
                            .pedido(pedido)
                            .build())
                    .toList();
            pedido.getItems().addAll(items);
        }

        pedidoRepository.save(pedido);
        log.info("Pedido entregue {} salvo no banco", dto.getNumeroPedido());
    }

    @Transactional
    public void deletar(Long id) {
        pedidoRepository.deleteById(id);
    }

    private LocalDate parseDate(String val) {
        if (val == null || val.isBlank()) return null;
        try {
            if (val.contains("/")) return LocalDate.parse(val, FMT_BR);
            return LocalDate.parse(val, FMT_ISO);
        } catch (Exception e) {
            return null;
        }
    }
}
