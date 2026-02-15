# Creators API Node.js SDK Example

## Prerequisites

### Node.js Version Support
- **Supported**: To run the SDK you need Node version 14 or higher.

## Setup Instructions

### 1. Install and Configure Node.js

For Node.js installation, you can download it from the official website: https://nodejs.org/en/download

```bash
# Check Node.js version
node --version
```

### 2. Install Dependencies
```bash
cd {path_to_dir}/creatorsapi-nodejs-sdk
npm install
npm run build
```

### 3. Run Sample Code
Navigate to the examples directory to run the samples.

```bash
cd examples
```

Before running the samples, you'll need to configure your API credentials in the sample files by replacing the following placeholders:

- `<YOUR CREDENTIAL ID>` - Your API credential ID
- `<YOUR CREDENTIAL SECRET>` - Your API credential secret  
- `<YOUR CREDENTIAL VERSION>` - Your credential version (e.g., "2.1" for NA, "2.2" for EU, "2.3" for FE region)
- `<YOUR MARKETPLACE>` - Your marketplace to which you want to send the request (e.g., "www.amazon.com" for US marketplace)
- `<YOUR PARTNER TAG>` - Your Partner Tag for the requested marketplace in applicable sample code snippet files

Run the following commands to run the sample files:

**Get detailed product information:**
```bash
node sampleGetItems.js
```

**Search for products:**
```bash
node sampleSearchItems.js
```

#### Other Samples
Check the `examples` directory for additional sample files with various API operations.
