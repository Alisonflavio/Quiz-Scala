# Operação do dia a dia

## Um lead não chegou no RD/planilha

1. Painel → formulário → **Respostas** → abra a resposta.
2. Em **Envios para integrações**, veja o último envio (✓ ou ✕, HTTP, erro).
3. Clique em **Reenviar para integrações**. O resultado aparece na lista.
4. Se der ✕ de novo, veja o histórico de execuções do cenário no Make.

Reenviar cria outra conversão no RD e outra linha na planilha. Use só quando o envio falhou.

## Uma publicação quebrou o formulário

Formulário → **Opções** → **Versões publicadas** → **Restaurar** na versão anterior. Ela entra no ar na hora e a restauração também fica no histórico.

## "Não dá para publicar: falta pergunta com a variável…"

Alguém apagou ou renomeou uma pergunta que o diagnóstico ou o Make usam. Volte o nome da variável da pergunta (painel lateral do editor) para o que a mensagem pede.

## A pessoa corrigiu o telefone na página de obrigado

O número corrigido aparece na resposta como `telefone_corrigido` e na coluna `lead_phone` do banco. **Ele não vai sozinho para o RD**, porque o Make só recebe o envio da conclusão. Até o cenário ser ajustado, confira esse campo antes de chamar.

## Excluir respostas ou formulário

Só administradores (aba Opções → Zona perigosa). Membros não veem os botões.

## Adicionar alguém ao time

Admin: **Seus times** → adicionar. Ou a pessoa se cadastra em `/cadastro` com e-mail `@ptadigital.com.br` e confirma pelo link enviado por e-mail.

## Consultar leads direto no Supabase

Use as colunas `lead_name`, `lead_email`, `lead_phone`, `diag_area`, `diag_bottleneck`, `diag_career_score` de `responses`. Exemplos em [banco.md](banco.md).
