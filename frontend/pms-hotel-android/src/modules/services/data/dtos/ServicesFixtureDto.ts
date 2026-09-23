/**
 * Frontend-only fixture contracts approved for IMP-AND-0103. They are not
 * Backend API DTOs and contain no transport, financial, or request-status data.
 */
export interface ServicesFixtureContext {
  currentStayFixtureKey: string;
  currentPropertyFixtureKey: string;
}

export interface ServiceCatalogFixtureDto {
  fixtureKey: string;
  label: string;
  detailText: string;
  priceText: string;
  /** Structured frontend/mock price source for a billable service. */
  priceAmount?: number;
  /** Hotel-defined mock setting, only applicable to the Late check-out fixture. */
  lateCheckoutUntil?: string;
}

export interface ServicesCatalogFixtureDto {
  context: ServicesFixtureContext;
  items: ServiceCatalogFixtureDto[];
}

export interface SubmitServiceRequestFixtureInput {
  serviceFixtureKey: string;
}

export interface SubmitServiceRequestFixtureResult {
  serviceFixtureKey: string;
}
