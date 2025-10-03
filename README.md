# Acquisitions API

A comprehensive serverless GraphQL API for querying acquisition data, enhanced with natural language processing capabilities using OpenAI's GPT-4o.

## 🚀 Features

- **GraphQL API**: Flexible querying with filtering, sorting, and pagination
- **Natural Language Interface**: Convert natural language queries to GraphQL using LLM
- **Rich Metadata**: Comprehensive analytics including price statistics, currency distribution, and company insights
- **Serverless Architecture**: AWS Lambda + Aurora PostgreSQL with auto-scaling
- **Comprehensive Testing**: 29 test files with 98%+ code coverage
- **Infrastructure as Code**: AWS CDK for reproducible deployments

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Gateway   │    │   Lambda Layer   │    │   Data Layer    │
│                 │    │                  │    │                 │
│ • GraphQL API   │───▶│ • GraphQL Lambda │───▶│ • Aurora PG     │
│ • LLM API       │    │ • LLM Lambda     │    │ • CSV Seeding   │
│ • REST Endpoints│    │ • Seed Lambda    │    │ • Indexes       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📊 Data Model

### Acquisitions
- **Core Fields**: ID, acquisition_id, price_amount, price_currency_code, acquired_at
- **Relationships**: Links to acquiring and acquired companies
- **Metadata**: Source URLs, descriptions, timestamps

### Companies
- **Core Fields**: ID, name, category_code, status, country_code
- **Relationships**: Referenced by acquisitions as acquiring/acquired entities

## 🔧 Tech Stack

- **Backend**: Node.js, TypeScript, AWS Lambda
- **Database**: Aurora PostgreSQL (Serverless V2)
- **API**: GraphQL with Apollo Server
- **AI/ML**: OpenAI GPT-4o for natural language processing
- **Infrastructure**: AWS CDK, VPC, API Gateway, Secrets Manager
- **Testing**: Jest with comprehensive coverage
- **Code Quality**: ESLint, Prettier, TypeScript strict mode

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- AWS CLI configured
- Docker (for local development)

### Local Development

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd acquisitions
   pnpm install
   ```

2. **Start DB and seed tables, run server**
   ```bash
   pnpm run start:api
   ```

3. **Access GraphQL Playground**
   - Localhost URL: `http://localhost:4000/v1/acquisitions`
   - AWS URL: `https://<API_GATEWAY_ID>.execute-api.eu-west-1.amazonaws.com/prod/v1/acquisitions`
   - The database will be automatically seeded with sample data
   - There is an included postman collection with some example queries

3. **Access LLM Playground**
   - URL: `http://localhost:4000/v1/llm/acquisitions`
   - AWS URL: `https://<API_GATEWAY_ID>.execute-api.eu-west-1.amazonaws.com/prod/v1/llm/acquisitions`
   - The database will be automatically seeded with sample data
   - There is an included postman collection with some example queries

### Deployment

1. **Deploy Infrastructure**
   ```bash
   npx cdk deploy
   ```

2. **Seed Database**
   ```bash
   aws lambda invoke --function-name SeedDBLambda --payload '{}' response.json
   ```

## 📡 API Usage

### GraphQL Endpoints

#### Query Acquisitions
```graphql
query {
  acquisitions(
    limit: 10
    offset: 0
    currency: "USD"
    acquired_from: "2020-01-01"
    sort_by: price_amount
    sort_order: DESC
  ) {
    rows {
      id
      acquisition_id
      price_amount
      price_currency_code
      acquired_at
      acquiring_company {
        name
        category_code
      }
      acquired_company {
        name
        category_code
      }
    }
    metadata {
      totalCount
      minPrice
      maxPrice
      avgPrice
      currencyCounts {
        currency
        count
      }
    }
  }
}
```

#### Query Single Acquisition
```graphql
query {
  acquisition(id: "1234") {
    id
    acquisition_id
    price_amount
    price_currency_code
    acquired_at
    acquiring_company {
      name
      category_code
    }
    acquired_company {
      name
      category_code
    }
  }
}
```

### Natural Language API

#### LLM Endpoint
```bash
POST /v1/llm/acquisitions
Content-Type: application/json

{
  "prompt": "Show me the top 5 most expensive acquisitions in USD from 2020"
}
```

**Response:**
```json
{
  "llmGeneratedQuery": {
    "graphql": "query($limit: Int, $currency: String, $acquired_from: DateTime, $sort_by: AcquisitionSortField, $sort_order: SortOrder) { acquisitions(limit: $limit, currency: $currency, acquired_from: $acquired_from, sort_by: $sort_by, sort_order: $sort_order) { rows { id acquisition_id price_amount acquired_at acquiring_company { name } acquired_company { name } } metadata { totalCount } } }",
    "variables": {
      "limit": 5,
      "currency": "USD",
      "acquired_from": "2020-01-01T00:00:00Z",
      "sort_by": "price_amount",
      "sort_order": "DESC"
    }
  },
  "response": {
    "data": {
      "acquisitions": {
        "rows": [...],
        "metadata": {...}
      }
    }
  }
}
```

## 🧪 Testing

### Run Tests
```bash
# Run all tests with coverage
pnpm test

# Run specific test file
pnpm test src/graphql/resolvers.test.ts

# Update snapshots
pnpm run test:update
```

### View API Documentation
Open `docs/index.html` in your browser to view the interactive API documentation with Swagger UI.

### Test Coverage
- **Statements**: 98%+
- **Branches**: 91%+
- **Functions**: 100%
- **Lines**: 98%+

### Test Categories
- **Unit Tests**: Individual function testing
- **Integration Tests**: Database and API testing
- **LLM Tests**: Natural language processing testing
- **Infrastructure Tests**: CDK stack validation

## 📁 Project Structure

```
src/
├── cdk/                    # Infrastructure as Code
│   ├── stack.ts           # AWS CDK stack definition
│   ├── index.ts           # Index
├── db/                    # Database layer
│   ├── db.ts             # Connection management
│   ├── db-util.ts        # Database utilities
│   ├── query-builders.ts # SQL query builders
│   ├── seed-db-lambda.ts # Handler to seed AWS DB
│   └── data/             # CSV seed data
├── graphql/               # GraphQL layer
│   ├── graphql-lambda.ts # Handler for graphql
│   ├── schema.ts         # GraphQL schema definition
│   ├── resolvers.ts      # Query resolvers
│   └── graphql-utils.ts  # GraphQL utilities
├── llm/                   # AI/ML layer
│   ├── client.ts         # OpenAI client
│   ├── llm-lambda.ts     # LLM Lambda handler
│   ├── llm-util.ts       # LLM utilities
│   ├── tools.ts          # Openai tool
│   └── prompts.ts        # System prompts
├── docs/                  # API Documentation
│   ├── openapi.yaml     # OpenAPI specification
│   ├── index.html       # Swagger UI interface (self-contained)
│   └── postman/          # Postman collections and envs
└── graphql.local.ts      # Local server
```

## 🔍 Key Design Decisions

### 1. **Serverless Architecture**
- **Choice**: AWS Lambda + Aurora Serverless
- **Rationale**: Scales automatically, no servers to manage, only pay for what you use
- **Trade-offs**: Cold starts can slow things down, but overall operations are much simpler

### 2. **GraphQL**
- **Choice**: GraphQL API with Apollo Server
- **Rationale**: Requested in spec but also flexible querying, strong typing, single endpoint
- **Trade-offs**: Steeper learning curve, but better overall dev experience

### 3. **Natural Language Interface**
- **Choice**: OpenAI GPT-4o integration
- **Rationale**: LLM requested in spec, plus makes data easier to access and lowers learning curve
- **Trade-offs**: API costs vs. smoother user experience

### 4. **Database Design**
- **Choice**: PostgreSQL with comprehensive indexing
- **Rationale**: Reliable, handles JSON, well-supported
- **Trade-offs**: More complex than simpler DBs, but keeps data safe and consistent

### 5. **Infrastructure as Code**
- **Choice**: AWS CDK with TypeScript
- **Rationale**: Lets you define infra in code, version it, and safely deploy
- **Trade-offs**: Slight learning curve, but makes maintenance easier

## 🚀 Future Improvements

### Short Term (1-3 months)
- [ ] **Add API key to secret manager**: Currently stored as env var for ease, but secret key should be stored in AWS Secrets Manager, or encrypted in AWS Parameter Store
- [ ] **API Rate Limiting**: Implement rate limiting for LLM endpoints
- [ ] **Caching Layer**: Add Redis caching for frequent queries
- [ ] **Error Handling**: Custom error handling should be implemented throughout the application
- [ ] **Monitoring**: CloudWatch dashboards and alerting
- [ ] **Logging**: Currently just using console log, should switch to a comprehensive logging solutions (AWS powertools perhaps)
- [ ] **CI/CD pipeline**: Using github actions to check test coverage and success, linting, vulnerabilities and finally auto deploy the code using CDK stack

### Medium Term (3-6 months)
- [ ] **Authentication**: JWT-based authentication and authorization
- [ ] **Data Export**: CSV/Excel export functionality
- [ ] **Advanced Analytics**: Time-series analysis and trends

### Long Term (6+ months)
- [ ] **Machine Learning**: Predictive analytics for acquisition trends
- [ ] **Multi-region**: Global deployment with data replication
- [ ] **Advanced LLM**: Fine-tuned models for domain-specific queries

## 🔧 Configuration

### Environment Variables
```bash
# Database
DB_HOST=your-aurora-endpoint
DB_PORT=5432
DB_NAME=your-database-name
DB_USER=your-username
DB_PASSWORD=your-password
DB_SECRET_ARN=arn:aws:secretsmanager:...

# OpenAI
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL="gpt-4o"

# Debug
DEBUG_SQL=1  # Enable SQL query analysis
```

## 📊 Performance Considerations

### Database Optimization
- **Indexes**: Comprehensive indexing on frequently queried fields
- **Connection Pooling**: pg.Pool for efficient connection management
- **Query Analysis**: EXPLAIN ANALYZE for query optimization

### Lambda Optimization
- **Memory Allocation**: 1024MB for optimal performance/cost ratio
- **Cold Start Mitigation**: Connection pooling and initialization
- **Error Handling**: Comprehensive error handling and retry logic

### LLM Optimization
- **Prompt Engineering**: Optimized prompts for consistent responses
- **Response Parsing**: Robust JSON parsing with fallbacks
- **Caching**: Consider caching frequent LLM responses

## 🔒 Security

### Current Security Measures
- **VPC**: Lambdas deployed in private subnets
- **Secrets Manager**: Database credentials stored securely
- **IAM Roles**: Least privilege access policies

### Security Improvements Needed
- [ ] **API Authentication**: JWT or API key authentication - Cognito?
- [ ] **Rate Limiting**: Prevent abuse of LLM endpoints
- [ ] **Input Sanitization**: Enhanced input validation
- [ ] **Audit Logging**: Comprehensive audit trail
- [ ] **Encryption**: Data encryption at rest and in transit
- [ ] **Secrets Manager**: API key to be stored securely

## 📈 Monitoring & Observability

### Current Monitoring
- **CloudWatch Logs**: Lambda function logs
- **Error Tracking**: Console.error logging
- **Debug Logging**: Comprehensive debug information

### Recommended Monitoring
- [ ] **CloudWatch Dashboards**: Custom metrics and visualizations
- [ ] **X-Ray Tracing**: Distributed tracing for performance analysis
- [ ] **Custom Metrics**: Business metrics (query volume, LLM usage)
- [ ] **Alerting**: Proactive alerting on errors and performance issues

## 🤝 Contributing

### Development Workflow
1. **Feature Branch**: Create feature branch from main
2. **Development**: Implement feature with tests
3. **Code Quality**: Run linting and formatting
4. **Testing**: Ensure all tests pass
5. **Review**: Submit pull request for review
6. **Deploy**: Merge to main triggers deployment

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Enforced code style
- **Prettier**: Automated code formatting
- **Testing**: Minimum 90% test coverage

## 🙏 Acknowledgments
- **Cursor** – Assisted with documentation, small code refactors and debugging.  
- **ChatGPT** – Helped refine documentation, simplify explanations, and up skilling in new tech.  
- **OpenAI**: For providing the GPT-4o API
- **AWS**: For the comprehensive serverless platform
- **Apollo GraphQL**: For the excellent GraphQL tooling
- **PostgreSQL**: For the robust database engine

---

**Built for modern data querying and natural language interfaces**