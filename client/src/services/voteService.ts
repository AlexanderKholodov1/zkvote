import { groth16 } from 'snarkjs';
import { utils } from 'ffjavascript';

export interface VoteProof {
  proof: any;
  publicSignals: any;
}

export class VoteService {
  private wasmPath: string;
  private zkeyPath: string;

  constructor() {
    this.wasmPath = '/circuits/vote.wasm';
    this.zkeyPath = '/circuits/vote.zkey';
  }

  async generateProof(
    voterId: number,
    voterSecret: string,
    voteOption: number
  ): Promise<VoteProof> {
    try {
      const input = {
        voterId: voterId,
        voterSecret: utils.stringToFr(voterSecret),
        voteOption: voteOption,
        pubVoterId: "0" // Se calculará dentro del circuito
      };

      const { proof, publicSignals } = await groth16.fullProve(
        input,
        this.wasmPath,
        this.zkeyPath
      );

      return { proof, publicSignals };
    } catch (error) {
      console.error('Error generating proof:', error);
      throw new Error('Failed to generate zero-knowledge proof');
    }
  }
}

export const voteService = new VoteService();