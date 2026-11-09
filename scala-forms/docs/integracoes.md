# Integrações

Configuradas por formulário, na aba **Integrações** do painel.

## Webhook (Make)

Enviado pelo servidor (`lib/responses.ts`, `dispatchIntegrations`), **depois** de responder ao navegador (`after()` do Next), para a pessoa não esperar.

- **Quando:** na conclusão (`integrationsTrigger: "complete"`). Com `"all"`, também a cada resposta parcial e evento.
- **Novas tentativas:** até 3 (0 s, 2 s, 6 s) em falha de rede, timeout, HTTP 429 e 5xx. 4xx não se repete.
- **Registro:** cada tentativa final entra em `responses.webhook_log` e aparece no painel ("Envios para integrações"), com o botão **Reenviar para integrações**.
- **Segurança:** só URLs públicas (nada de IP interno), até 3 redirecionamentos (`lib/safe-fetch.ts`).

### Formato "respondi" (o que está em uso)

Imita o Respondi para o cenário antigo do Make continuar funcionando (`lib/respondi.ts`). Só envia em `completa`, uma vez por lead.

```json
{
  "form": { "form_name": "...", "form_id": "A6BNBSMsX6" },
  "respondent": {
    "respondent_id": "...",
    "status": "completed",
    "score": 0-100,
    "date": "2026-11-09 14:30:00",
    "answers": { "Nome": "...", "Telefone com DDD": "55 41988887777", "E-mail": "...", "...": "..." },
    "raw_answers": [{ "question": "...", "answer": "..." }],
    "respondent_utms": { "utm_source": "...", "...": "..." }
  },
  "extras": { "...todos os campos do formato padrão..." }
}
```

`score` é a pontuação convertida para 0–100, porque o Make classifica com cortes fixos.

### Formato padrão

JSON plano com `evento` (`completa`, `parcial`, `validou_sim`, `validou_nao`, `corrigiu`, `clicou_whatsapp`, `telefone_corrigido`, `chegou_fim`, `abriu_aula`…), `resposta_id`, `numero`, `pontuacao`, `temperatura`, uma chave por variável (e `<variavel>_valor` na múltipla escolha), UTMs e, no Diagnóstico Scala: `diagnostico`, `area`, `gargalo`, `renda_meta`, `prisao_pct`, `meta_pct`, `confirmou_diagnostico`, `clicou_whatsapp`, `video_assistido`, `aula_assistida`, `chegou_fim`, `telefone_corrigido`.

Progresso de vídeo (`video_*`, `aula_*`) nunca vai para o webhook; fica só no painel.

## Cenário do Make em uso

- Webhook **"Respondi - Mentoria Scala"** → cenário **"Respondi Mentoria Scala - (AUTOMAÇÃO QUALIFICADORA)"** (time Personal Trainer Academy, pasta "Fluxos revisados THIAGO").
- Passos: classifica pela nota (≥ 66 `Comprador`, ≥ 45 `Morno`, senão `Frio`) → formata telefone → **RD Station**: conversão `RESPONDI` com tag `mentoriascala/<classe>` → **Google Sheets**: aba "Mentoria Scala".
- Hoje o cenário **não usa** diagnóstico, renda, meta, horas, objetivo, @ nem UTMs além de `utm_source`. Tudo isso já chega no envio (em `extras`); falta mapear no Make.
- A classificação do Make (66/45) é diferente da temperatura do app (configurada no editor, em Pontuação).

## Google Planilha

POST do mesmo JSON do formato padrão para a URL configurada (Apps Script). Desligado hoje.

## Pixels (navegador)

`components/runner/trackers.ts`. Meta, GTM, GA4 e TikTok, cada um ligado por formulário.

| Momento                | Meta                    | GA              | TikTok       | GTM               |
| ---------------------- | ----------------------- | --------------- | ------------ | ----------------- |
| Abriu                  | PageView                | config          | page         | gtm.js            |
| Concluiu               | `Lead` + `EndForm`      | `generate_lead` | `SubmitForm` | `form_conversion` |
| Clicou no WhatsApp     | `Contact`               | `Contact`       |              | `Contact`         |
| Diagnóstico confirmado | `DiagnosticoConfirmado` |                 |              |                   |
| Vídeo do diagnóstico   | `VideoPlay`, `Video75`  |                 |              |                   |

Na `/obrigado` o Pixel da Meta do formulário (`?fid=`) é carregado com PageView e os eventos `AulaPlay`, `Aula75` e `ObrigadoFim`.
