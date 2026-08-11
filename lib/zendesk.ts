// Server-only Zendesk API client. Never import this from a Client Component —
// it handles the raw API token.

export type ZendeskCredentials = {
  subdomain: string;
  agentEmail: string;
  apiToken: string;
};

export class ZendeskApiError extends Error {}

function baseUrl(subdomain: string) {
  const clean = subdomain.trim().replace(/^https?:\/\//, "").replace(/\.zendesk\.com.*$/, "");
  return `https://${clean}.zendesk.com/api/v2`;
}

function authHeader({ agentEmail, apiToken }: ZendeskCredentials) {
  const token = Buffer.from(`${agentEmail}/token:${apiToken}`).toString("base64");
  return `Basic ${token}`;
}

async function zendeskFetch(creds: ZendeskCredentials, path: string) {
  let res: Response;
  try {
    res = await fetch(`${baseUrl(creds.subdomain)}${path}`, {
      headers: {
        Authorization: authHeader(creds),
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch {
    throw new ZendeskApiError(
      `Couldn't reach ${creds.subdomain}.zendesk.com. Check the subdomain is correct.`
    );
  }

  if (!res.ok) {
    let message = `Zendesk returned ${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      message = body?.error?.message || body?.error || body?.description || message;
    } catch {
      // non-JSON error body, keep the status line
    }
    throw new ZendeskApiError(message);
  }

  return res.json();
}

/** Verifies credentials by fetching the authenticated agent's own profile. */
export async function testZendeskConnection(creds: ZendeskCredentials) {
  const data = await zendeskFetch(creds, "/users/me.json");
  const user = data?.user;
  if (!user || user.role === "end-user") {
    throw new ZendeskApiError(
      "Authenticated, but this account doesn't look like an agent/admin token."
    );
  }
  return { agentName: user.name as string, agentId: user.id as number };
}

export type ZendeskCustomerLookup = {
  found: boolean;
  name?: string;
  email?: string;
  phone?: string | null;
  organization?: string | null;
  openTicketCount?: number;
  recentTickets?: { id: number; subject: string; status: string }[];
};

/** Looks up a customer by email and their most recent tickets. */
export async function lookupZendeskCustomer(
  creds: ZendeskCredentials,
  email: string
): Promise<ZendeskCustomerLookup> {
  const query = encodeURIComponent(`type:user email:${email}`);
  const search = await zendeskFetch(creds, `/search.json?query=${query}`);
  const user = search?.results?.[0];

  if (!user) {
    return { found: false };
  }

  let organization: string | null = null;
  if (user.organization_id) {
    try {
      const org = await zendeskFetch(creds, `/organizations/${user.organization_id}.json`);
      organization = org?.organization?.name ?? null;
    } catch {
      organization = null;
    }
  }

  let recentTickets: ZendeskCustomerLookup["recentTickets"] = [];
  let openTicketCount = 0;
  try {
    const tickets = await zendeskFetch(
      creds,
      `/users/${user.id}/tickets/requested.json?sort_by=created_at&sort_order=desc`
    );
    const list = (tickets?.tickets ?? []) as { id: number; subject: string; status: string }[];
    recentTickets = list.slice(0, 5).map((t) => ({ id: t.id, subject: t.subject, status: t.status }));
    openTicketCount = list.filter((t) => t.status === "open" || t.status === "new").length;
  } catch {
    recentTickets = [];
  }

  return {
    found: true,
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    organization,
    openTicketCount,
    recentTickets,
  };
}
