package com.wbm.feeder.config;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@Order(1)
public class AuthFilter implements Filter {

    private final JdbcTemplate jdbc;

    public AuthFilter(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest  request  = (HttpServletRequest)  req;
        HttpServletResponse response = (HttpServletResponse) res;

        String path = request.getRequestURI();

        // Allow auth endpoints and OPTIONS (CORS preflight) through
        if (path.startsWith("/api/auth/") || "OPTIONS".equalsIgnoreCase(request.getMethod())) {
            chain.doFilter(req, res);
            return;
        }

        // Only protect /api/** routes
        if (!path.startsWith("/api/")) {
            chain.doFilter(req, res);
            return;
        }

        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Não autenticado.\"}");
            return;
        }

        String token = auth.substring(7);
        var rows = jdbc.queryForList(
                "SELECT 1 FROM auth_token WHERE token = ?", token);

        if (rows.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Token inválido.\"}");
            return;
        }

        chain.doFilter(req, res);
    }
}
