<!-- Gerado por npm run agent:handoff. Nao editar manualmente. -->
# Implementacoes em andamento

Resumo operacional gerado de `.agents/continue.ia`.

## FT-013 - Normatizar URL curta busca QR e descoberta

Objetivo: Conciliar o RCF e a documentação para URL curta sem /_/, busca desambiguada, QR Code por publicação e descoberta contínua de fontes confiáveis.

<table>
<thead><tr><th>Etapa</th><th>Tarefa</th><th>Status</th></tr></thead>
<tbody>
<tr>
<td rowspan="3">Conciliar demanda e contratos</td>
<td>Registrar FT normativa e FT de código</td>
<td><span style="color:#15803d">&#9679;</span> concluído</td>
</tr>
<tr>
<td>Auditar divergências entre norma e implementação</td>
<td><span style="color:#64748b">&#9679;</span> pendente</td>
</tr>
<tr>
<td>Evoluir RCF e README</td>
<td><span style="color:#64748b">&#9679;</span> pendente</td>
</tr>
<tr>
<td rowspan="3">Validar norma</td>
<td>Validar modalidades e rastreabilidade</td>
<td><span style="color:#64748b">&#9679;</span> pendente</td>
</tr>
<tr>
<td>Confirmar preservação de compatibilidade histórica</td>
<td><span style="color:#64748b">&#9679;</span> pendente</td>
</tr>
<tr>
<td>Comitar contrato normativo</td>
<td><span style="color:#64748b">&#9679;</span> pendente</td>
</tr>
<tr>
<td rowspan="2">Autorizar execução técnica</td>
<td>Registrar autorização humana recebida</td>
<td><span style="color:#15803d">&#9679;</span> concluído</td>
</tr>
<tr>
<td>Liberar FT-014 conforme dependência</td>
<td><span style="color:#64748b">&#9679;</span> pendente</td>
</tr>
</tbody>
</table>

## FT-014 - Implementar URL curta busca QR e descoberta

Objetivo: Implementar configuração central, short URL canônico, busca com desambiguação, QR SVG incremental e manutenção de fontes com observabilidade e cache coerentes.

<table>
<thead><tr><th>Etapa</th><th>Tarefa</th><th>Status</th></tr></thead>
<tbody>
<tr>
<td rowspan="3">Diagnosticar arquitetura e pontos afetados</td>
<td>Mapear geração e resolução de rotas curtas</td>
<td><span style="color:#64748b">&#9679;</span> pendente</td>
</tr>
<tr>
<td>Mapear busca, índice e renderização</td>
<td><span style="color:#64748b">&#9679;</span> pendente</td>
</tr>
<tr>
<td>Mapear mantenedor, cache e workflow</td>
<td><span style="color:#64748b">&#9679;</span> pendente</td>
</tr>
<tr>
<td rowspan="3">Centralizar configuração e short URL</td>
<td>Criar configuração global tipada</td>
<td><span style="color:#64748b">&#9679;</span> pendente</td>
</tr>
<tr>
<td>Remover dependência funcional de /_/</td>
<td><span style="color:#64748b">&#9679;</span> pendente</td>
</tr>
<tr>
<td>Atualizar validações e fixtures</td>
<td><span style="color:#64748b">&#9679;</span> pendente</td>
</tr>
<tr>
<td rowspan="3">Busca e desambiguação</td>
<td>Aplicar mínimo configurado somente em comando explícito</td>
<td><span style="color:#64748b">&#9679;</span> pendente</td>
</tr>
<tr>
<td>Abrir diretamente somente resultado único</td>
<td><span style="color:#64748b">&#9679;</span> pendente</td>
</tr>
<tr>
<td>Exibir lista paginada e ordenada para múltiplos</td>
<td><span style="color:#64748b">&#9679;</span> pendente</td>
</tr>
<tr>
<td rowspan="3">QR Code por publicação</td>
<td>Escolher dependência validada em fonte oficial</td>
<td><span style="color:#64748b">&#9679;</span> pendente</td>
</tr>
<tr>
<td>Gerar SVG incremental e validável no build</td>
<td><span style="color:#64748b">&#9679;</span> pendente</td>
</tr>
<tr>
<td>Integrar miniatura e download acessível no layout</td>
<td><span style="color:#64748b">&#9679;</span> pendente</td>
</tr>
<tr>
<td rowspan="3">Descoberta de fontes e URLs</td>
<td>Modelar hosts associados por fonte confiável</td>
<td><span style="color:#64748b">&#9679;</span> pendente</td>
</tr>
<tr>
<td>Corrigir normalização, correspondência, deduplicação e cache</td>
<td><span style="color:#64748b">&#9679;</span> pendente</td>
</tr>
<tr>
<td>Implementar relatório e códigos de saída coerentes</td>
<td><span style="color:#64748b">&#9679;</span> pendente</td>
</tr>
<tr>
<td rowspan="3">Validar, registrar e publicar</td>
<td>Executar testes e build</td>
<td><span style="color:#64748b">&#9679;</span> pendente</td>
</tr>
<tr>
<td>Atualizar memória e handoff</td>
<td><span style="color:#64748b">&#9679;</span> pendente</td>
</tr>
<tr>
<td>Comitar, convergir e push</td>
<td><span style="color:#64748b">&#9679;</span> pendente</td>
</tr>
</tbody>
</table>
