export function toProjectOffer(po, { includePartners = false } = {}) {
  const base = {
    id: po.id,
    inquiryId: po.inquiry_id,
    totalClientPrice: Number(po.total_client_price),
    validUntil: po.valid_until ?? null,
    status: po.status,
    notes: po.notes ?? null,
    leadTimeDays: po.lead_time_days ?? null,
    createdAt: po.created_at,
    itemCount: po.project_offer_items ? po.project_offer_items.length : 0,
  };
  if (!includePartners) return base;
  return {
    ...base,
    experts: po.project_offer_items
      ? po.project_offer_items
          .filter((i) => i.expert_offers)
          .map((i) => ({
            id: i.expert_offers.id,
            expertId: i.expert_offers.expert_id,
            proposedPrice: Number(i.expert_offers.proposed_price),
            leadTimeDays: i.expert_offers.estimated_lead_time_days ?? null,
            notes: i.expert_offers.notes ?? null,
            expert: i.expert_offers.users
              ? {
                  id: i.expert_offers.users.id,
                  firstName: i.expert_offers.users.first_name,
                  lastName: i.expert_offers.users.last_name,
                  companyName: i.expert_offers.users.company_name,
                  email: i.expert_offers.users.email ?? null,
                }
              : null,
          }))
      : [],
  };
}
