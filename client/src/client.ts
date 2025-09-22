import axios from 'axios';
import readline from 'readline';
import fs from 'fs';

// Configuration
const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const SERVER_URL = config.serverUrl;

// Global variables
let voterId = '';
let selectedOption = -1;

// Interfaces
interface VotingInfo {
    subject: string;
    options: string[];
}

interface VoteResult {
    message: string;
}

interface VoterVerification {
    valid: boolean;
}

async function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  try {
    console.log('=== ZKVote Client ===');
    console.log('Connecting to server...\n');

    // 1. Verify server connection silently
    try {
      await axios.get(`${SERVER_URL}/health`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          console.error('Error: Cannot connect to voting server');
        } else if (error.response?.status === 503) {
          console.error('\nError: The voting is not yet configured on the server');
        } else {
          console.error('\nError: Cannot connect to server');
          if (error.message) {
            console.error('Detail:', error.message);
          }
        }
      } else {
        console.error('\nError: Cannot connect to server');
      }
      process.exit(1);
    }

  // 2. Request voter ID first
  voterId = await promptUser('Enter your voter ID: ');
    if (!voterId) {
      console.log('Error: You must enter a valid voter ID');
      process.exit(1);
    }

    // 3. Verify voter ID
    try {
      const verificationResponse = await axios.post<VoterVerification>(
        `${SERVER_URL}/api/verify`,
        { voterId },
        { headers: { 'Content-Type': 'application/json' } }
      );
      // Debug: log the verification response from server
      // (this helps if the server returns a useful error payload)
      // console.debug('verify response:', verificationResponse.data);
      if (!verificationResponse.data.valid) {
        console.log('Error: Invalid voter ID');
        process.exit(1);
      }
      // Only print connected once, after verification succeeds
      console.log('Connected to server successfully.\n');
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.data) {
        console.log('Error: Could not verify voter ID -', error.response.data.error || JSON.stringify(error.response.data));
      } else {
        console.log('Error: Could not verify voter ID');
      }
      process.exit(1);
    }

    // 4. Get voting information only after ID verification
    const { data } = await axios.get<VotingInfo>(`${SERVER_URL}/api/voting-info`);
    const { subject, options } = data;

    console.log('\n=== Current Vote ===');
    console.log(`Subject: ${subject}`);
    console.log('\nAvailable options:');
    options.forEach((opt: string, idx: number) => {
      console.log(`[${idx}] ${opt}`);
    });

    // 5. Request vote option
    const optionStr = await promptUser('\nEnter your choice (number): ');
    selectedOption = parseInt(optionStr, 10);
    
    if (isNaN(selectedOption) || selectedOption < 0 || selectedOption >= options.length) {
      console.log('Error: Invalid option');
      process.exit(1);
    }

    // 6. Submit vote
    const voteResponse = await axios.post<VoteResult>(`${SERVER_URL}/api/vote`, {
      voterId,
      option: selectedOption
    });

    console.log('\n✓', voteResponse.data.message);
  } catch (error: any) {
    if (error.response?.data?.error) {
      console.error('\nError:', error.response.data.error);
    } else {
      console.error('\nError:', error.message || 'Unknown error');
    }
    process.exit(1);
  } finally {
    // Clear sensitive data from memory
    voterId = '';
    selectedOption = -1;
    
    console.log('\nCleaning up temporary data...');
    
    // Remove temporary files if they exist
    const tempFiles = ['input.json', 'temp.json', 'witness.wtns'];
    for (const file of tempFiles) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`✓ Removed ${file}`);
      }
    }
  }
}

main();