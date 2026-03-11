# Splitwise Backend

## Production Deployment Instructions

### Environment Variables
Copy `.env.example` to `.env` and set the values:

- `JWT_SECRET`: Your secure JWT secret key
- `MONGODB_URI`: MongoDB connection string
- `PORT`: Port for backend server (default: 8080)

### Build & Run

1. Build with Maven:
   ```sh
   mvn clean package
   ```
2. Run:
   ```sh
   java -jar target/splitwise-backend.jar
   ```

### Docker

Build and run with Docker:
```sh
# Build
cd backend
Docker build -t splitwise-backend .

# Run
Docker run -d --env-file .env -p 8080:8080 splitwise-backend
```

### Notes
- Ensure environment variables are set securely in production.
- CORS allowed origins should match your frontend production URL.
