"""The consent page's HTML, in the app's colours. Every value put in is escaped."""

from html import escape

STYLE = """
:root { color-scheme: dark; }
body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 16px;
  background: #151923; color: #ece6da; font: 16px/1.5 ui-sans-serif, system-ui, sans-serif; }
main { width: 100%; max-width: 420px; background: #1b2030; border-radius: 16px; padding: 28px; }
h1 { margin: 0 0 12px; font-size: 22px; line-height: 1.3; }
p { margin: 0 0 12px; color: #a3a7b3; }
strong { color: #ece6da; font-weight: 600; }
ul { margin: 0 0 20px; padding-left: 20px; color: #a3a7b3; }
.actions { display: flex; gap: 12px; }
button { flex: 1; border: 0; border-radius: 10px; padding: 12px; font: inherit; cursor: pointer; }
.allow { background: #f0cf5a; color: #151923; font-weight: 600; }
.deny { background: #242a3b; color: #ece6da; }
button:focus-visible { outline: 2px solid #ece6da; outline-offset: 2px; }
small { display: block; margin-top: 16px; color: #6f7689; }
"""


def shell(title: str, body: str) -> str:
    return (
        '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        f"<title>{escape(title)}</title><style>{STYLE}</style></head>"
        f"<body><main>{body}</main></body></html>"
    )


def page(app_name: str, email: str, request_token: str, check: str) -> str:
    name = escape(app_name)
    return shell(
        f"Connect {app_name} to JokeBox",
        f"""<h1>Let {name} read your JokeBox?</h1>
<p>Signed in as <strong>{escape(email)}</strong>.</p>
<p>{name} will be able to read:</p>
<ul><li>your jokes, premises, sets and shows</li>
<li>your observations, Brainstorms and Rewrites</li>
<li>your Craft notes and analyses</li></ul>
<p>It can't change or delete anything. What it reads goes into your chats with it.</p>
<form method="post">
<input type="hidden" name="request" value="{escape(request_token)}">
<input type="hidden" name="check" value="{escape(check)}">
<div class="actions">
<button class="deny" name="decision" value="deny">Don't allow</button>
<button class="allow" name="decision" value="allow">Allow</button>
</div></form>
<small>Disconnect any time from your account menu in JokeBox.</small>""",
    )


EXPIRED = shell(
    "Connecting to JokeBox",
    """<h1>This link has run out</h1>
<p>Sign-in links last 10 minutes. Go back to Claude and connect JokeBox again.</p>""",
)
