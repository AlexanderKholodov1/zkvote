pragma circom 2.1.6;

template ZKVote() {
    // Entrada del voto
    signal input vote;        // El voto (0 o 1)
    signal output out;        // Salida del circuito
    
    // Verificar que el voto sea binario (0 o 1)
    vote * (1 - vote) === 0;
    
    // La salida es igual al voto
    out <== vote;
}

component main = ZKVote();