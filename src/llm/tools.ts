type Tool = {
  type: "function";
  name: string;
  description: string;
  strict: boolean;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };
};

export const tools: Tool[] = [
  {
    type: "function",
    name: "acquisitions",
    description:
      "List acquisitions with optional filters like date range, currency, type of payment and sorting",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: "Max number of acquisitions to return (default 100)",
        },
        offset: { type: "integer", description: "Pagination offset" },
        term_code: {
          type: "string",
          description: "Type of payment used in the acquisition",
        },
        currency: {
          type: "string",
          description: "Currency code of the transaction (e.g., USD, GBP)",
        },
        acquired_from: {
          type: "string",
          format: "date-time",
          description: "Filter acquisitions acquired after this date",
        },
        acquired_to: {
          type: "string",
          format: "date-time",
          description: "Filter acquisitions acquired before this date",
        },
        sort_by: {
          type: "string",
          enum: ["acquired_at", "price_amount", "acquisition_id"],
          description: "Sort field",
        },
        sort_order: {
          type: "string",
          enum: ["ASC", "DESC"],
          description: "Sort order",
        },
      },
      additionalProperties: false,
      required: [
        "limit",
        "offset",
        "term_code",
        "currency",
        "acquired_from",
        "acquired_to",
        "sort_by",
        "sort_order",
      ],
    },
  },
] as const;
