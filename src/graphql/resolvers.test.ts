/* eslint-disable @typescript-eslint/no-explicit-any */
import { Acquisition } from "../db/db-types";
import { resolvers } from "./resolvers";
import * as db from "../db/db";
import { Pool } from "pg";

//  set env config
process.env.DB_USER = "localTestUser";
process.env.DB_PASSWORD = "localTestPassword";
process.env.DB_HOST = "localTestHost";
process.env.DB_PORT = "1234";
process.env.DB_NAME = "localTestDbName";
process.env.DEBUG_SQL = "0";

describe("Resolvers", () => {
  const acquisitionRows = [
    {
      id: "1",
      acquisition_id: "1",
      acquiring_object_id: "c:11",
      acquired_object_id: "c:10",
      term_code: null,
      price_amount: "20000000.0",
      price_currency_code: "USD",
      acquired_at: "2007-05-29T23:00:00.000Z",
      source_url:
        "http://venturebeat.com/2007/05/30/fox-interactive-confirms-purchase-of-photobucket-and-flektor/",
      source_description:
        "Fox Interactive confirms purchase of Photobucket and Flektor",
      created_at: "2007-05-31T21:19:54.000Z",
      updated_at: "2008-05-21T18:23:44.000Z",
      acquired_id: "c:10",
      acquired_name: "Flektor",
      acquired_category: "games_video",
      acquired_status: "acquired",
      acquired_country: "USA",
      acquiring_id: "c:11",
      acquiring_name: "Fox Interactive Media",
      acquiring_category: "web",
      acquiring_status: "operating",
      acquiring_country: "USA",
    },
  ];
  const metaRows = [
    {
      total: "9562",
      min: "1.0",
      max: "2600000000000.0",
      avg: "388619054.84448860",
      sum: "3715975402423.0",
      earliest_date: "2007-05-29T23:00:00.000Z",
      latest_date: "2007-05-29T23:00:00.000Z",
    },
  ];
  const currencyRows = [{ price_currency_code: "USD", count: "1" }];
  const companyRows = [
    {
      distinct_acquiring_companies: "1",
      distinct_acquired_companies: "1",
    },
  ];
  let mockDbClient: Pool;
  beforeEach(() => {
    mockDbClient = {
      query: jest.fn().mockImplementation((sql: string, idNum?: number[]) => {
        if (sql.includes("MIN(price_amount) AS min")) {
          // meta
          return Promise.resolve({
            rows: metaRows,
          });
        } else if (sql.includes("GROUP BY price_currency_code")) {
          // currency meta
          return Promise.resolve({
            rows: currencyRows,
          });
        } else if (sql.includes("COUNT(DISTINCT acquired_object_id)")) {
          // company meta
          return Promise.resolve({
            rows: companyRows,
          });
        } else if (idNum && idNum[0] === 1234) {
          // no acquisition found
          return Promise.resolve({
            rows: [],
          });
        } else {
          // return default acquisition data
          return Promise.resolve({
            rows: acquisitionRows,
          });
        }
      }),
    } as unknown as Pool;

    jest.spyOn(db, "getPool").mockResolvedValue(mockDbClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Acquisition.price", () => {
    it("should return formatted string when values exist", () => {
      const parent = {
        price_amount: "100",
        price_currency_code: "USD",
      };
      const result = resolvers.Acquisition.price(parent as Acquisition);
      expect(result).toBe("100 USD");
    });

    it("should return null when values missing", () => {
      const parent = { price_amount: null, price_currency_code: null };
      const result = resolvers.Acquisition.price(
        parent as unknown as Acquisition,
      );
      expect(result).toBeNull();
    });
  });

  describe("Query.acquisitions", () => {
    it("should call mockDbClient.query four times", async () => {
      await resolvers.Query.acquisitions(null, {});

      expect(mockDbClient.query).toHaveBeenCalledTimes(4);
      // data
      expect(mockDbClient.query).toHaveBeenNthCalledWith(
        1,
        `
        SELECT 
          a.*, 
          acquired.id AS acquired_id, acquired.name AS acquired_name, acquired.category_code AS acquired_category, acquired.status AS acquired_status, acquired.country_code AS acquired_country,
          acquiring.id AS acquiring_id, acquiring.name AS acquiring_name, acquiring.category_code AS acquiring_category, acquiring.status AS acquiring_status, acquiring.country_code AS acquiring_country
        FROM acquisitions a
        LEFT JOIN companies acquired ON a.acquired_object_id = acquired.id
        LEFT JOIN companies acquiring ON a.acquiring_object_id = acquiring.id
       ORDER BY id LIMIT $1 OFFSET $2`,
        [100, 0],
      );
      // meta
      expect(mockDbClient.query).toHaveBeenNthCalledWith(
        2,
        `SELECT COUNT(*) AS total, MIN(price_amount) AS min, MAX(price_amount) AS max, AVG(price_amount) AS avg, SUM(price_amount) AS sum, MIN(acquired_at) AS earliest_date, MAX(acquired_at) AS latest_date FROM acquisitions  WHERE price_amount IS NOT NULL`,
        [],
      );
      // currency meta
      expect(mockDbClient.query).toHaveBeenNthCalledWith(
        3,
        `SELECT price_currency_code, COUNT(*) as count FROM acquisitions  GROUP BY price_currency_code`,
        [],
      );
      // company meta
      expect(mockDbClient.query).toHaveBeenNthCalledWith(
        4,
        `SELECT COUNT(DISTINCT acquiring_object_id) AS distinct_acquiring_companies, COUNT(DISTINCT acquired_object_id) AS distinct_acquired_companies FROM acquisitions `,
        [],
      );
    });

    it("should return acquisitions", async () => {
      const result = await resolvers.Query.acquisitions(null, {
        limit: 2,
        offset: 1,
        term_code: "cash",
        currency: "GBP",
        acquired_from: "2001-01-01",
        acquired_to: "2001-01-31",
        acquiring_object_id: "c:11",
        acquired_object_id: "c:10",
        sort_by: "price_amount",
        sort_order: "DESC",
      });

      expect(result).toEqual({
        rows: [
          {
            ...acquisitionRows[0],
            acquiring_company: {
              id: "c:11",
              name: "Fox Interactive Media",
              category_code: "web",
              status: "operating",
              country_code: "USA",
            },
            acquired_company: {
              id: "c:10",
              name: "Flektor",
              category_code: "games_video",
              status: "acquired",
              country_code: "USA",
            },
          },
        ],
        metadata: {
          totalCount: 9562,
          minPrice: 1,
          maxPrice: 2600000000000,
          avgPrice: 388619054.8444886,
          sumPrice: 3715975402423,
          distinctAcquiredCompanies: 1,
          distinctAcquiringCompanies: 1,
          earliestDate: "2007-05-29T23:00:00.000Z",
          latestDate: "2007-05-29T23:00:00.000Z",
          currencyCounts: [
            {
              count: 1,
              currency: "USD",
            },
          ],
        },
      });
    });

    it("should throw an error when db throws", async () => {
      const mockDbClientWithError = {
        query: jest.fn().mockRejectedValue(new Error("ERROR")),
      } as any;
      jest.spyOn(db, "getPool").mockResolvedValue(mockDbClientWithError);

      try {
        await resolvers.Query.acquisitions(null, {});
      } catch (error) {
        expect(error.message).toBe("Error when querying DB");
      }
      expect.assertions(1);
    });

    it("should handle null metadata values", async () => {
      const mockDbClientWithNullMeta = {
        query: jest.fn().mockImplementation((sql: string) => {
          if (sql.includes("COUNT")) {
            return Promise.resolve({
              rows: [{}],
            });
          } else {
            return Promise.resolve({ rows: [] });
          }
        }),
      } as any;

      jest.spyOn(db, "getPool").mockResolvedValue(mockDbClientWithNullMeta);

      const result = await resolvers.Query.acquisitions(null, {});
      expect(result.metadata).toEqual({
        totalCount: NaN,
        minPrice: null,
        maxPrice: null,
        avgPrice: null,
        sumPrice: null,
        earliestDate: null,
        latestDate: null,
        currencyCounts: [
          {
            count: null,
            currency: null,
          },
        ],
        distinctAcquiringCompanies: null,
        distinctAcquiredCompanies: null,
      });
    });
  });

  describe("Query.acquisition", () => {
    it("should call mockDbClient.query once", async () => {
      await resolvers.Query.acquisition(null, { id: "1" });

      expect(mockDbClient.query).toHaveBeenCalledTimes(1);
      expect(mockDbClient.query).toHaveBeenNthCalledWith(
        1,
        `
          SELECT 
            a.*, 
            acquired.id AS acquired_id, acquired.name AS acquired_name, acquired.category_code AS acquired_category, acquired.status AS acquired_status, acquired.country_code AS acquired_country,
            acquiring.id AS acquiring_id, acquiring.name AS acquiring_name, acquiring.category_code AS acquiring_category, acquiring.status AS acquiring_status, acquiring.country_code AS acquiring_country
          FROM acquisitions a
          LEFT JOIN companies acquired ON a.acquired_object_id = acquired.id
          LEFT JOIN companies acquiring ON a.acquiring_object_id = acquiring.id
          WHERE a.id = $1
        `,
        [1],
      );
    });

    it("should return one acquisition", async () => {
      const result = await resolvers.Query.acquisition(null, { id: "1" });

      expect(result).toEqual({
        ...acquisitionRows[0],
        acquiring_company: {
          id: "c:11",
          name: "Fox Interactive Media",
          category_code: "web",
          status: "operating",
          country_code: "USA",
        },
        acquired_company: {
          id: "c:10",
          name: "Flektor",
          category_code: "games_video",
          status: "acquired",
          country_code: "USA",
        },
      });
    });

    it("should return null if DB returns no rows", async () => {
      const result = await resolvers.Query.acquisition(null, { id: "1234" });

      expect(result).toBeNull();
    });

    it("should throw an error when db throws", async () => {
      const mockDbClientWithError = {
        query: jest.fn().mockRejectedValue(new Error("ERROR")),
      } as any;
      jest.spyOn(db, "getPool").mockResolvedValue(mockDbClientWithError);

      try {
        await resolvers.Query.acquisition(null, { id: "1234" });
      } catch (error) {
        expect(error.message).toBe("Error when querying DB");
      }
      expect.assertions(1);
    });
  });
});
