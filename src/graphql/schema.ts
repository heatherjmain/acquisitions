import { gql } from "graphql-tag";
import { DocumentNode } from "graphql";

export const typeDefs: DocumentNode = gql`
  scalar DateTime

  enum AcquisitionSortField {
    acquired_at
    price_amount
    acquisition_id
  }

  enum SortOrder {
    ASC
    DESC
  }

  type Acquisition {
    id: ID!

    """
    Unique ID of the acquisition
    """
    acquisition_id: String

    """
    Acquiring entity unique ID
    """
    acquiring_object_id: String

    """
    Acquired entity unique ID
    """
    acquired_object_id: String

    """
    Type of payment used in the acquisition
    """
    term_code: String

    """
    Amount paid
    """
    price_amount: Float

    """
    Currency of the transaction
    """
    price_currency_code: String

    """
    Date of the deal
    """
    acquired_at: DateTime

    """
    URL of the information source
    """
    source_url: String

    """
    Short description of the information sources
    """
    source_description: String

    """
    Date the record was created at
    """
    created_at: DateTime

    """
    Date the record was updated at
    """
    updated_at: DateTime

    """
    Computed field containing price_amount and price_currency_code eg 100000 GBP
    """
    price: String

    """
    Acquiring entity name
    """
    acquiring_company: Company

    """
    Acquired entity name
    """
    acquired_company: Company
  }

  type Company {
    """
    Entity ID
    """
    entity_id: ID!

    """
    Entity name
    """
    name: String

    """
    Entity category
    """
    category_code: String

    """
    Operation status
    """
    status: String

    """
    Country code
    """
    country_code: String

    """
    Date the record was created at
    """
    created_at: String

    """
    Date the record was updated at
    """
    updated_at: String
  }

  type CurrencyCount {
    currency: String
    count: Int
  }

  type AcquisitionMetadata {
    totalCount: Int!
    minPrice: Float
    maxPrice: Float
    avgPrice: Float
    sumPrice: Float
    earliestDate: DateTime
    latestDate: DateTime
    currencyCounts: [CurrencyCount]
    distinctAcquiringCompanies: Int
    distinctAcquiredCompanies: Int
  }

  type AcquisitionsResult {
    rows: [Acquisition!]!
    metadata: AcquisitionMetadata!
  }

  type Query {
    """
    List acquisitions with optional filters like date range, currency, type of payment and sorting by acquisition id, acquisition date or price.
    """
    acquisitions(
      limit: Int = 100
      offset: Int = 0
      term_code: String
      currency: String
      acquired_from: DateTime
      acquired_to: DateTime
      acquiring_object_id: String
      acquired_object_id: String
      sort_by: AcquisitionSortField
      sort_order: SortOrder = ASC
    ): AcquisitionsResult!
    """
    Get details about a single acquisition by its ID.
    """
    acquisition(id: ID!): Acquisition
  }
`;
