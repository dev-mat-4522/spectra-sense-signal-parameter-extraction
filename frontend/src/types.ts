export type NavigationTab = 
  | 'dashboard' 
  | 'ingest' 
  | 'analysis' 
  | 'visualizations' 
  | 'dag-pipeline' 
  | 'reports' 
  | 'settings';

export type ModulationType = 'AUTO' | 'QPSK' | '16-QAM' | '64-QAM' | '8-PSK' | 'BPSK' | 'FSK';

export type WaveformChannel = 'combined' | 'in-phase' | 'quadrature';

export interface SignalSample {
  id: string;
  name: string;
  category: 'Satellite' | 'Tactical UAV' | 'Maritime AIS' | 'Defense Radar';
  frequency: string;
  modulation: ModulationType;
  sampleRate: number;
  baudRate: number;
  snrDb: number;
  confidence: number;
  extractedBits: number;
  syncFlag: string;
  description: string;
  hexPayload: string[];
  asciiPayload: string;
  threatLevel: 'Low' | 'Medium' | 'High' | 'Classified';
}

export interface DAGStep {
  id: number;
  name: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  latencyMs: number;
  details: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'ANALYSIS' | 'WARN' | 'SUCCESS';
  message: string;
}

export interface BackendResult {
  status?: string;
  file: {
    format: string;
    dtype_origin?: string;
    fs_source?: string;
    samples_analyzed: number;
    file_samples: number;
    file_bytes: number;
    noise_floor: number;
  };
  params: {
    sampling_rate_hz: number;
    sampling_confidence: number;
    symbol_rate_hz: number;
    symbol_confidence: number;
    cfo_hz: number;
    bandwidth_hz: number;
    sps_estimated: number;
    sps_assumed: number;
    blind: boolean;
  };
  amc: {
    modulation: string;
    confidence: number;
    engine: string;
  };
  demod: {
    modulation: string;
    bits: number;
    bits_per_symbol: number;
    carrier_rotation_deg: number;
  };
  deinterleaver: {
    method: string;
    bits: number;
  };
  fec: {
    method: string;
    corrected: number;
    bits: number;
    detection?: {
      coded: boolean;
      method: string;
      confidence: number;
      closure_ber?: number;
    };
  };
  correlation: {
    num_hits: number;
    framing: any;
    header_len_bits: number;
    payload_len_bits: number;
    payload_hex: string;
    payload_hex_truncated: boolean;
    payload_ascii: string[];
    ambiguity_trial: string;
    ax25?: any[];
    csp?: any[];
    payload_status?: string;
    frame_valid?: boolean;
  };
  visual: {
    waterfall: number[][];
    constellation: number[][];
    psd: number[];
  };
}
