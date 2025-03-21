# create-nextjs-mfe

A CLI tool to create Next.js Micro Frontend applications using Module Federation.

## Installation

```bash
npm install -g create-nextjs-mfe
```

## Usage

Create a new Micro Frontend application:

```bash
create-nextjs-mfe create host-app --type host --port 3000 --remotes "remote1,remote2"
```

### Options

- `--type`: Type of application (host or remote)
- `--port`: Port number for the application
- `--remotes`: Comma-separated list of remote applications (for host apps only)

## Project Structure

The CLI will create:
- A host application
- Remote applications as specified
- Module Federation configuration
- TypeScript and TailwindCSS setup
- Exposed components (Counter and Card)

## Getting Started

1. Create your applications:
```bash
create-nextjs-mfe create host-app --type host --port 3000 --remotes remote1,remote2
```

2. Install dependencies:
```bash
cd apps/remote1
npm install --legacy-peer-deps
cd ../remote2
npm install --legacy-peer-deps
cd ../host-app
npm install --legacy-peer-deps
```

3. Start the applications:
```bash
# Start remote apps first
cd apps/remote1
npm run dev

# In another terminal
cd apps/remote2
npm run dev

# Finally, start the host app
cd apps/host-app
npm run dev
```

## License

MIT 