# n8n Environment Variables

Set these in your n8n instance under **Settings → Environment Variables** (self-hosted)
or as **Credentials** (n8n Cloud).

| Variable | Description |
|---|---|
| `N8N_WEBHOOK_SECRET` | Same random string as in your Next.js `.env.local` |
| `SUPABASE_URL` | `https://xxxx.supabase.co` (no trailing slash) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (Settings → API) |
| `RESEND_API_KEY` | Your Resend API key |
| `RESEND_FROM_EMAIL` | Verified sender e.g. `deals@yourfirm.com` |
| `APPROVAL_EMAIL_RECIPIENTS` | Comma-separated list e.g. `a@firm.com,b@firm.com` |

## Anthropic Credential

In n8n, create a **Header Auth** credential:
- Name: `Anthropic API`
- Header Name: `x-api-key`
- Header Value: `sk-ant-your-key-here`

Attach this credential to the **HTTP — Claude API Analysis** node.

## Webhook URLs (copy into Next.js .env.local)

After activating the workflows, copy the webhook URLs from each Webhook node:

```
N8N_INTAKE_WEBHOOK_URL=https://your-n8n.com/webhook/deal-intake
N8N_SEND_EMAIL_WEBHOOK_URL=https://your-n8n.com/webhook/send-founder-email
```
