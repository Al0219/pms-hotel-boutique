/** UI-safe read models for the frontend-only Services fixture. */
export interface ServicesCatalogContext {
  currentStayFixtureKey: string;
  currentPropertyFixtureKey: string;
}

export interface ServiceCatalogItem {
  fixtureKey: string;
  label: string;
  detailText: string;
  priceText: string;
  priceAmount?: number;
  lateCheckoutUntil?: string;
}

export interface ServicesCatalog {
  context: ServicesCatalogContext;
  items: ServiceCatalogItem[];
}

/** A mock submission acknowledgement, not a ServiceRequest domain entity. */
export interface ServiceRequestSubmission {
  serviceFixtureKey: string;
}
