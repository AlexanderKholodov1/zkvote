# ZKVote - Voting Client

This is the web client for the ZKVote voting system. It allows voters to participate in voting in an anonymous and verifiable way.

## Requirements

- Node.js v14 or higher
- npm v6 or higher

## Installation

1. Install dependencies:
```bash
npm install
```

## Usage

1. Run the client:
```bash
npm run vote
```

The client will guide you through the voting process:
1. It will connect to the server (default http://localhost:3000)
2. It will show you the available voting options
3. It will ask for your voter ID and your choice
4. It will send your vote securely and anonymously
5. It will show current results
6. It will automatically clean up temporary data

## Configuration

The server is configured in `config.json`:
```json
{
  "serverUrl": "http://localhost:3000"
}
```

2. Install dependencies:
```bash
npm install
```

## Usage

1. Start the client:
```bash
npm run dev
```

2. Abrir http://localhost:5173 en el navegador

## Cómo Votar

1. Introducir el ID de votante proporcionado
2. Introducir el secreto de votante
3. Seleccionar "Sí" o "No"
4. Confirmar el voto

El sistema generará una prueba ZK para garantizar el anonimato de tu voto mientras verifica tu elegibilidad para votar.