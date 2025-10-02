import { Pool } from "pg";
import * as dbUtil from "./db-util";
import { getColumnNames, loadCsv, seedingRequired, seedTable } from "./db-util";
import path from "path";

const filePath = path.join(__dirname, "data/companies-data.csv");

describe("db-util", () => {
  let mockDbClient: Pool;
  let mockDbClientWithError: Pool;
  beforeAll(() => {
    mockDbClient = {
      query: jest.fn().mockImplementation((sql: string) => {
        if (sql.includes("column_name")) {
          // returning column names
          return Promise.resolve({
            rows: [{ column_name: "id" }, { column_name: "name" }],
          });
        } else if (sql.includes(`seededTestTable`)) {
          // returning count
          return Promise.resolve({
            rows: [{ count: "5" }],
          });
        } else if (sql.includes(`emptyTestTable`)) {
          // returning 0 count
          return Promise.resolve({
            rows: [{ count: "0" }],
          });
        } else {
          return Promise.resolve({ rows: [] });
        }
      }),
    } as unknown as Pool;

    mockDbClientWithError = {
      query: jest.fn().mockRejectedValue(new Error("ERROR")),
    } as unknown as Pool;
  });
  describe("getColumnNames", () => {
    it("should make one call to client.query", async () => {
      await getColumnNames(mockDbClient, "testTable");

      expect(mockDbClient.query).toHaveBeenCalledTimes(1);
      expect(mockDbClient.query).toHaveBeenCalledWith(
        `SELECT column_name 
               FROM information_schema.columns 
               WHERE table_name = $1 
               ORDER BY ordinal_position`,
        ["testTable"],
      );
    });

    it("should return column names", async () => {
      const columnNames = await getColumnNames(mockDbClient, "testTable");

      expect(columnNames).toEqual(["id", "name"]);
    });

    it("should throw an error if dbClient errors", async () => {
      try {
        await getColumnNames(mockDbClientWithError, "testTable");
      } catch (error) {
        expect(error.message).toEqual(
          "Error when collecting column names for testTable table",
        );
      }
      expect.assertions(1);
    });
  });

  describe("loadCsv", () => {
    it("should return some records", async () => {
      const records = await loadCsv(filePath);

      expect(records.length).toBeGreaterThan(1);
    });
  });

  describe("seedingRequired", () => {
    it("should return false when table is already seeded", async () => {
      const seedingIsRequired = await seedingRequired(
        mockDbClient,
        "seededTestTable",
      );

      expect(seedingIsRequired).toBeFalsy();
    });

    it("should return true when table is NOT already seeded", async () => {
      const seedingIsRequired = await seedingRequired(
        mockDbClient,
        "emptyTestTable",
      );

      expect(seedingIsRequired).toBeTruthy();
    });
  });

  describe("seedTable", () => {
    let seedingRequiredSpy;
    let loadCsvSpy;
    beforeEach(() => {
      jest.clearAllMocks();

      seedingRequiredSpy = jest.spyOn(dbUtil, "seedingRequired");

      loadCsvSpy = jest.spyOn(dbUtil, "loadCsv").mockResolvedValue([
        {
          id: "1",
          name: "first",
        },
      ]);
    });

    it("should should call seedingRequired", async () => {
      seedingRequiredSpy.mockResolvedValueOnce(false);

      const tableName = "testTable";
      await seedTable(mockDbClient, 10, {
        tableName: tableName,
        csvFile: filePath,
        columns: ["id", "name"],
      });

      expect(seedingRequiredSpy).toHaveBeenCalledTimes(1);
      expect(seedingRequiredSpy).toHaveBeenCalledWith(mockDbClient, tableName);
    });

    it("should call loadCsv when seedingRequired is true", async () => {
      seedingRequiredSpy.mockResolvedValueOnce(true);
      loadCsvSpy.mockResolvedValueOnce([
        {
          id: "1",
          name: "first",
        },
      ]);

      const tableName = "testTable";
      await seedTable(mockDbClient, 10, {
        tableName: tableName,
        csvFile: filePath,
        columns: ["id", "name"],
      });

      expect(loadCsvSpy).toHaveBeenCalledTimes(1);
      expect(loadCsvSpy).toHaveBeenCalledWith(
        expect.stringContaining("data/companies-data.csv"),
      );
    });

    it("should should throw an error when loadCsv errors", async () => {
      seedingRequiredSpy.mockResolvedValueOnce(true);
      loadCsvSpy.mockRejectedValueOnce(new Error("OOPS"));

      try {
        const tableName = "testTable";
        await seedTable(mockDbClient, 10, {
          tableName: tableName,
          csvFile: filePath,
          columns: ["id", "name"],
        });
      } catch (error) {
        expect(error.message).toEqual(
          expect.stringContaining("Error when loading"),
        );
      }
      expect.assertions(1);
    });

    it("should seed table correctly in batches", async () => {
      const rows = [
        { id: "1", name: "first" },
        { id: "2", name: "second" },
        { id: "3", name: "third" },
      ];

      seedingRequiredSpy.mockResolvedValue(true);
      loadCsvSpy.mockResolvedValue(rows);

      const tableName = "testTable";
      const batchSize = 2;
      await seedTable(mockDbClient, batchSize, {
        tableName: tableName,
        csvFile: filePath,
        columns: ["id", "name"],
      });

      expect(mockDbClient.query).toHaveBeenCalled();

      const firstBatch = (mockDbClient.query as jest.Mock).mock.calls[0][1];
      expect(firstBatch).toEqual([
        rows[0].id,
        rows[0].name,
        rows[1].id,
        rows[1].name,
      ]);

      const secondBatch = (mockDbClient.query as jest.Mock).mock.calls[1][1];
      expect(secondBatch).toEqual([rows[2].id, rows[2].name]);
    });

    it("should throw an error when db client errors", async () => {
      seedingRequiredSpy.mockResolvedValueOnce(true);
      loadCsvSpy.mockResolvedValueOnce([{ id: "1", name: "first" }]);

      const tableName = "testTable";
      const batchSize = 2;

      try {
        await seedTable(mockDbClientWithError, batchSize, {
          tableName: tableName,
          csvFile: filePath,
          columns: ["id", "name"],
        });
      } catch (error) {
        expect(error.message).toEqual(`Error when seeding ${tableName} table`);
      }
      expect.assertions(1);
    });
  });
});
