#!/usr/bin/env bash
# Genera sample-repo/: un repo git de juguete que reproduce a proposito el bug
# DEMO-5042 (ver fixtures/). No se versiona dentro de este repo (tiene su
# propio .git), por eso se genera con este script en vez de comitearse.
set -e

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$HERE/../sample-repo"

rm -rf "$REPO"
mkdir -p "$REPO/src/main/java/ar/com/fedpat/avisoobra"
cd "$REPO"

git init -q
git config user.email "demo@flockit.com.ar"
git config user.name "Demo FedPat"

cat > README.md <<'EOF'
# sample-repo

Repo de ejemplo (ficticio) generado por scripts/setup-sample-repo.sh, usado
como fixture para demostrar las tools git del MCP hu-bug-analyzer. Simula el
core "aviso-de-obra" de FedPat.
EOF
git add README.md
git commit -q -m "chore: commit inicial"
git branch -M main

cat > "src/main/java/ar/com/fedpat/avisoobra/EstadoAviso.java" <<'EOF'
package ar.com.fedpat.avisoobra;

public enum EstadoAviso {
    PENDIENTE,
    APROBADO,
    RECHAZADO,
    ANULADO
}
EOF

git checkout -q -b feature/DEMO-5001-filtro-estado

cat > "src/main/java/ar/com/fedpat/avisoobra/Aviso.java" <<'EOF'
package ar.com.fedpat.avisoobra;

public class Aviso {

    private Long id;
    private EstadoAviso estado;

    public Aviso(Long id, EstadoAviso estado) {
        this.id = id;
        this.estado = estado;
    }

    public Long getId() {
        return id;
    }

    public EstadoAviso getEstado() {
        return estado;
    }
}
EOF

cat > "src/main/java/ar/com/fedpat/avisoobra/AvisoObraFilterService.java" <<'EOF'
package ar.com.fedpat.avisoobra;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class AvisoObraFilterService {

    // Mapa de labels de UI (en espaniol) a EstadoAviso.
    // NOTA: falta el label "Pendiente" en este mapa.
    private static final Map<String, EstadoAviso> ESTADO_POR_LABEL = Map.of(
        "Aprobado", EstadoAviso.APROBADO,
        "Rechazado", EstadoAviso.RECHAZADO,
        "Anulado", EstadoAviso.ANULADO
    );

    public List<Aviso> filtrarPorEstado(List<Aviso> avisos, String estadoSeleccionado) {
        if (estadoSeleccionado == null || estadoSeleccionado.isBlank()) {
            return avisos;
        }
        EstadoAviso estado = ESTADO_POR_LABEL.get(estadoSeleccionado);
        if (estado == null) {
            return List.of();
        }
        return avisos.stream()
            .filter(a -> a.getEstado() == estado)
            .collect(Collectors.toList());
    }
}
EOF

git add src
git commit -q -m "feature: implementar filtro de avisos por estado (DEMO-5001)"

echo "sample-repo generado en $REPO"
git log --oneline --all --graph
