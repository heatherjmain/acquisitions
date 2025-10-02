import { GraphQLScalarType } from "graphql";
import { getPool } from "../db/db";
import { Acquisition } from "../db/db-types";
import { runDbQuery } from "../db/db-util";
import { mapField } from "./graphql-utils";
import {
  buildAcquisitionQuery,
  buildAcquisitionsQuery,
  buildCompanyMetaQuery,
  buildCurrencyMetaQuery,
  buildMetaQuery,
} from "../db/query-builders";

export const resolvers = {
  DateTime: new GraphQLScalarType({
    name: "DateTime",
  }),
  Query: {
    acquisitions: async (
      _: unknown,
      args: {
        limit?: number;
        offset?: number;
        term_code?: string;
        currency?: string;
        acquired_from?: string;
        acquired_to?: string;
        acquiring_object_id?: string;
        acquired_object_id?: string;
        sort_by?: string;
        sort_order?: string;
      },
    ) => {
      const {
        limit = 100,
        offset = 0,
        term_code,
        currency,
        acquired_from,
        acquired_to,
        acquiring_object_id,
        acquired_object_id,
        sort_by,
        sort_order = "ASC",
      } = args;
      const conditions: string[] = [];
      const values: (string | number | null | undefined)[] = [];
      let paramIndex = 1;

      if (term_code) {
        conditions.push(`term_code = $${paramIndex++}`);
        values.push(term_code);
      }

      if (currency) {
        conditions.push(`price_currency_code = $${paramIndex++}`);
        values.push(currency);
      }

      if (acquired_from) {
        conditions.push(`acquired_at >= $${paramIndex++}`);
        values.push(acquired_from);
      }

      if (acquired_to) {
        conditions.push(`acquired_at <= $${paramIndex++}`);
        values.push(acquired_to);
      }

      if (acquiring_object_id) {
        conditions.push(`acquiring_object_id = $${paramIndex++}`);
        values.push(args.acquiring_object_id);
      }

      if (acquired_object_id) {
        conditions.push(`acquired_object_id = $${paramIndex++}`);
        values.push(args.acquired_object_id);
      }

      values.push(limit, offset);
      console.debug("🐛 Query.acquisitions - values:", values);

      const dbClient = await getPool();

      let res;
      try {
        res = await runDbQuery(
          dbClient,
          buildAcquisitionsQuery({
            conditions,
            sort_by,
            sort_order,
            paramIndex,
          }),
          values,
        );
        console.debug(
          "🐛 Acquisitions query - data returned from DB",
          JSON.stringify(res.rows, null, 2),
        );
      } catch (error) {
        console.error(`⚠️ Error when querying DB`, JSON.stringify(error));
        throw new Error("Error when querying DB");
      }

      const rowsRes = res.rows.map((row) => ({
        ...row,
        acquiring_company: {
          id: row.acquiring_id,
          name: row.acquiring_name,
          category_code: row.acquiring_category,
          status: row.acquiring_status,
          country_code: row.acquiring_country,
        },
        acquired_company: {
          id: row.acquired_id,
          name: row.acquired_name,
          category_code: row.acquired_category,
          status: row.acquired_status,
          country_code: row.acquired_country,
        },
      }));

      const baseCondition =
        conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

      // aggregate data
      let metaRes;
      try {
        metaRes = await runDbQuery(
          dbClient,
          buildMetaQuery({ baseCondition }),
          values.slice(0, values.length - 2),
        );
        console.debug(
          "🐛 Acquisitions query - meta returned from DB",
          metaRes.rows,
        );
      } catch (error) {
        console.error(
          `⚠️ Error when querying DB for meta`,
          JSON.stringify(error),
        );
        throw new Error("Error when querying DB for meta");
      }

      // currency distribution
      let currencyRes;
      try {
        currencyRes = await runDbQuery(
          dbClient,
          buildCurrencyMetaQuery({ baseCondition }),
          values.slice(0, values.length - 2),
        );
        console.debug(
          "🐛 Acquisitions query - currency meta returned from DB",
          currencyRes.rows,
        );
      } catch (error) {
        console.error(
          `⚠️ Error when querying DB for currency meta`,
          JSON.stringify(error),
        );
        throw new Error("Error when querying DB for currency meta");
      }

      // Distinct company counts
      let companyRes;
      try {
        companyRes = await runDbQuery(
          dbClient,
          buildCompanyMetaQuery({ baseCondition }),
          values.slice(0, values.length - 2),
        );
        console.debug(
          "🐛 Acquisitions query - company meta returned from DB",
          companyRes.rows,
        );
      } catch (error) {
        console.error(
          `⚠️ Error when querying DB for company meta`,
          JSON.stringify(error),
        );
        throw new Error("Error when querying DB for company meta");
      }

      const metaRow = metaRes.rows[0];
      const companyRow = companyRes.rows[0];

      const minPrice = mapField(metaRow, "min", true);
      const maxPrice = mapField(metaRow, "max", true);
      const avgPrice = mapField(metaRow, "avg", true);
      const sumPrice = mapField(metaRow, "sum", true);
      const earliestDate = mapField(metaRow, "earliest_date");
      const latestDate = mapField(metaRow, "latest_date");
      const currencyCounts = currencyRes.rows.map((row) => ({
        currency: mapField(row, "price_currency_code"),
        count: mapField(row, "count", true),
      }));
      const distinctAcquiringCompanies = mapField(
        companyRow,
        "distinct_acquiring_companies",
        true,
      );
      const distinctAcquiredCompanies = mapField(
        companyRow,
        "distinct_acquired_companies",
        true,
      );

      return {
        rows: rowsRes,
        metadata: {
          totalCount: Number(metaRow?.total),
          minPrice,
          maxPrice,
          avgPrice,
          sumPrice,
          earliestDate,
          latestDate,
          currencyCounts,
          distinctAcquiringCompanies,
          distinctAcquiredCompanies,
        },
      };
    },
    acquisition: async (_: unknown, args: { id: string }) => {
      const dbClient = await getPool();
      const idNum = Number(args.id);

      console.debug("🐛 Query.acquisition - idNum:", idNum);

      let res;
      try {
        res = await runDbQuery(dbClient, buildAcquisitionQuery(), [idNum]);
      } catch (error) {
        console.error(`⚠️ Error when querying DB`, JSON.stringify(error));
        throw new Error("Error when querying DB");
      }

      if (!res.rows[0]) return null;

      const row = res.rows[0];
      return {
        ...row,
        acquiring_company: {
          id: row.acquiring_id,
          name: row.acquiring_name,
          category_code: row.acquiring_category,
          status: row.acquiring_status,
          country_code: row.acquiring_country,
        },
        acquired_company: {
          id: row.acquired_id,
          name: row.acquired_name,
          category_code: row.acquired_category,
          status: row.acquired_status,
          country_code: row.acquired_country,
        },
      };
    },
  },
  Acquisition: {
    price: (acquisition: Acquisition) => {
      if (!acquisition.price_amount || !acquisition.price_currency_code)
        return null;
      return `${acquisition.price_amount} ${acquisition.price_currency_code}`;
    },
  },
};
