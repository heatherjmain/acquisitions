export type SeedConfig = {
  tableName: string;
  csvFile: string;
  columns: string[];
};

export type CsvRecord = Record<string, string | undefined>;

export type Acquisition = {
  id: string;
  acquisition_id: string;
  acquiring_object_id?: string;
  acquired_object_id?: string;
  term_code?: string;
  price_amount?: string;
  price_currency_code?: string;
  acquired_at?: string;
  source_url?: string;
  source_description?: string;
  created_at?: string;
  updated_at?: string;
};

export type Company = {
  id: string;
  entity_id: string;
  name: string;
  category_code?: string;
  status?: string;
  country_code?: string;
  created_at?: string;
  updated_at?: string;
};
