import { getPieceColor, getLegalMoves, isKingInCheck, applyMove, initialGameState, isSquareAttacked, findKing } from './chess-logic.js';

const PIECE_VALUES = {
    'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 20000, // White pieces
    'p': -100, 'n': -320, 'b': -330, 'r': -500, 'q': -900, 'k': -20000, // Black pieces
    ' ': 0
};

// Advanced Piece-Square Tables (PSTs) to reward positional play
const PAWN_PST = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0]
];

const KNIGHT_PST = [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
];

const BISHOP_PST = [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
];

const ROOK_PST = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [0,  0,  0,  5,  5,  0,  0,  0]
];

const QUEEN_PST = [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [-5,  0,  5,  5,  5,  5,  0, -5],
    [0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  5,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
];

const KING_PST = [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20, 20,  0,  0,  0,  0, 20, 20],
    [20, 30, 10,  0,  0, 10, 30, 20]
];

const PST_TABLES = {
    'P': PAWN_PST,
    'N': KNIGHT_PST,
    'B': BISHOP_PST,
    'R': ROOK_PST,
    'Q': QUEEN_PST,
    'K': KING_PST
};

// Helper to determine friendly piece protection
function isFriendlyDefended(board, row, col, color, gameState) {
    const originalPiece = board[row][col];
    // Temporarily replace with an opponent's pawn to bypass "cannot capture own piece" check in isValidMove
    const opponentPawn = color === 'white' ? 'p' : 'P';
    board[row][col] = opponentPawn;
    const defended = isSquareAttacked(board, row, col, color, gameState);
    board[row][col] = originalPiece; // restore
    return defended;
}

// King safety evaluation based on pawn shield
function evaluateKingSafety(board, kingRow, kingCol, color) {
    let safetyScore = 0;
    const direction = color === 'white' ? -1 : 1;
    const pawnChar = color === 'white' ? 'P' : 'p';
    
    // King-side castled King safety
    if (kingCol >= 5) {
        const shieldCols = [kingCol - 1, kingCol, kingCol + 1].filter(c => c >= 0 && c < 8);
        shieldCols.forEach(c => {
            const r = kingRow + direction;
            if (r >= 0 && r < 8) {
                if (board[r][c] === pawnChar) {
                    safetyScore += 40; // Pawn shield intact
                } else if (r + direction >= 0 && r + direction < 8 && board[r + direction][c] === pawnChar) {
                    safetyScore += 20; // Pawn pushed one square
                } else {
                    safetyScore -= 35; // Pawn shield broken/missing!
                }
            }
        });
    }
    // Queen-side castled King safety
    else if (kingCol <= 2) {
        const shieldCols = [kingCol - 1, kingCol, kingCol + 1].filter(c => c >= 0 && c < 8);
        shieldCols.forEach(c => {
            const r = kingRow + direction;
            if (r >= 0 && r < 8) {
                if (board[r][c] === pawnChar) {
                    safetyScore += 35;
                } else if (r + direction >= 0 && r + direction < 8 && board[r + direction][c] === pawnChar) {
                    safetyScore += 15;
                } else {
                    safetyScore -= 30;
                }
            }
        });
    }
    
    return safetyScore;
}

// Detects whether `attackingColor` has an immediate forced checkmate in 1
function hasMateThreat(board, attackingColor, gameState) {
    const defendingColor = attackingColor === 'white' ? 'black' : 'white';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece === ' ' || getPieceColor(piece) !== attackingColor) continue;
            const moves = getLegalMoves(board, r, c, attackingColor, gameState);
            for (const m of moves) {
                const { newBoard, newGameState } = applyMove(board, m, gameState);
                // Check if the defending king is now in check AND has no legal escapes
                if (isKingInCheck(newBoard, defendingColor, newGameState)) {
                    let hasMoves = false;
                    outer: for (let rr = 0; rr < 8; rr++) {
                        for (let cc = 0; cc < 8; cc++) {
                            const p = newBoard[rr][cc];
                            if (p !== ' ' && getPieceColor(p) === defendingColor) {
                                if (getLegalMoves(newBoard, rr, cc, defendingColor, newGameState).length > 0) {
                                    hasMoves = true;
                                    break outer;
                                }
                            }
                        }
                    }
                    if (!hasMoves) return true; // Mate in 1 found!
                }
            }
        }
    }
    return false;
}

// Advanced evaluation incorporating material, PST, King safety, defended pieces, and hanging piece penalties
export function evaluateBoard(board, gameState = initialGameState) {
    let score = 0;
    
    // Track kings' positions for king safety evaluation
    let whiteKingPos = null;
    let blackKingPos = null;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece === ' ') continue;

            const pieceColor = getPieceColor(piece);
            const upperPiece = piece.toUpperCase();
            
            // 1. Material Score
            const value = PIECE_VALUES[piece];
            score += value;

            // 2. Positional Score (Piece-Square Table)
            const pstTable = PST_TABLES[upperPiece];
            if (pstTable) {
                if (pieceColor === 'white') {
                    score += pstTable[r][c];
                } else {
                    score -= pstTable[7 - r][c];
                }
            }

            // Track Kings
            if (upperPiece === 'K') {
                if (pieceColor === 'white') whiteKingPos = [r, c];
                else blackKingPos = [r, c];
            }

            // 3. Tactical / Defensive Safety (Only for non-King pieces)
            if (upperPiece !== 'K') {
                const opponentColor = pieceColor === 'white' ? 'black' : 'white';
                
                // Check if piece is attacked by opponent
                const isAttacked = isSquareAttacked(board, r, c, opponentColor, gameState);
                
                if (isAttacked) {
                    // Check if piece is defended by friendly pieces
                    const isDefended = isFriendlyDefended(board, r, c, pieceColor, gameState);
                    
                    if (!isDefended) {
                        // HANGING PIECE PENALTY: Huge penalty for leaving pieces completely hanging!
                        const penalty = Math.abs(PIECE_VALUES[piece]) * 0.65; // Penalty is 65% of piece value
                        if (pieceColor === 'white') {
                            score -= penalty;
                        } else {
                            score += penalty;
                        }
                    } else {
                        // Defended but attacked: check if opponent attacker is of lower value
                        // To keep it simple and ultra-responsive, we apply a minor penalty for the pressure
                        const penalty = Math.abs(PIECE_VALUES[piece]) * 0.15; // 15% pressure penalty
                        if (pieceColor === 'white') {
                            score -= penalty;
                        } else {
                            score += penalty;
                        }
                    }
                } else {
                    // Piece is safe: minor reward if it is defended (solid structure)
                    const isDefended = isFriendlyDefended(board, r, c, pieceColor, gameState);
                    if (isDefended) {
                        const reward = Math.abs(PIECE_VALUES[piece]) * 0.05; // 5% solid defense reward
                        if (pieceColor === 'white') {
                            score += reward;
                        } else {
                            score -= reward;
                        }
                    }
                }
            }
        }
    }

    // 4. King Safety Evaluation
    if (whiteKingPos) {
        score += evaluateKingSafety(board, whiteKingPos[0], whiteKingPos[1], 'white');
    }
    if (blackKingPos) {
        score -= evaluateKingSafety(board, blackKingPos[0], blackKingPos[1], 'black');
    }

    // 5. Mate-threat Detection — strongly penalise positions where the opponent has a forced
    //    checkmate in 1. This prevents the AI from ignoring the human's mating plans.
    if (hasMateThreat(board, 'white', gameState)) {
        score -= 350000; // White can deliver checkmate next move — catastrophic for black (AI)
    }
    if (hasMateThreat(board, 'black', gameState)) {
        score += 350000; // Black (AI) can deliver checkmate next move — great for AI
    }

    return score;
}

// Move Ordering Heuristics (Checks, captures, promotions sorted first)
export function scoreMove(board, move, currentPlayerColor) {
    let score = 0;
    const piece = board[move.startRow][move.startCol];
    const target = board[move.endRow][move.endCol];

    // Capture heuristic (MVV-LVA: Most Valuable Victim - Least Valuable Assault)
    if (target !== ' ') {
        score += 10000 + (Math.abs(PIECE_VALUES[target]) - Math.abs(PIECE_VALUES[piece]) / 100);
    }

    // Promotion heuristic
    if (piece.toUpperCase() === 'P' && (move.endRow === 0 || move.endRow === 7)) {
        score += 8000;
    }

    // Positional improvement differential (PST score change)
    const pstTable = PST_TABLES[piece.toUpperCase()];
    if (pstTable) {
        const isWhite = (currentPlayerColor === 'white');
        const oldPst = isWhite ? pstTable[move.startRow][move.startCol] : pstTable[7 - move.startRow][move.startCol];
        const newPst = isWhite ? pstTable[move.endRow][move.endCol] : pstTable[7 - move.endRow][move.endCol];
        score += (newPst - oldPst) * 2;
    }

    return score;
}

// Transposition Table for caching positions
const transpositionTable = new Map();

// Zobrist Hashing variables
let zobristTable = [];
let zobristInitialized = false;

function initZobrist() {
    if (zobristInitialized) return;
    zobristTable = [];
    const pieces = ['P', 'N', 'B', 'R', 'Q', 'K', 'p', 'n', 'b', 'r', 'q', 'k', ' '];
    for (let r = 0; r < 8; r++) {
        zobristTable[r] = [];
        for (let c = 0; c < 8; c++) {
            zobristTable[r][c] = {};
            pieces.forEach(p => {
                // Generate a random 32-bit integer
                zobristTable[r][c][p] = Math.floor(Math.random() * 0xFFFFFFFF);
            });
        }
    }
    zobristInitialized = true;
}

function computeHash(board) {
    initZobrist();
    let hash = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            hash ^= zobristTable[r][c][piece];
        }
    }
    return hash;
}

// Track evaluated nodes for stats reporting
let nodesEvaluated = 0;

// Helper to filter and return capture moves
function getCaptureMoves(board, color, gameState) {
    const captureMoves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece !== ' ' && getPieceColor(piece) === color) {
                const moves = getLegalMoves(board, r, c, color, gameState);
                for (const m of moves) {
                    if (m.isCapture) {
                        captureMoves.push(m);
                    }
                }
            }
        }
    }
    return captureMoves;
}

// Quiescence Search to avoid the horizon effect
function quiescence(board, alpha, beta, maximizingPlayer, aiColor, gameState) {
    nodesEvaluated++;
    
    // Normalize evaluation: positive is good for AI, negative is bad
    const standPat = evaluateBoard(board, gameState) * (aiColor === 'white' ? 1 : -1);
    
    if (maximizingPlayer) {
        if (standPat >= beta) return beta;
        if (standPat > alpha) alpha = standPat;
        
        let captures = getCaptureMoves(board, aiColor, gameState);
        captures.sort((a, b) => scoreMove(board, b, aiColor) - scoreMove(board, a, aiColor));
        
        for (const move of captures) {
            const { newBoard, newGameState } = applyMove(board, move, gameState);
            const val = quiescence(newBoard, alpha, beta, false, aiColor, newGameState);
            if (val >= beta) return beta;
            if (val > alpha) alpha = val;
        }
        return alpha;
    } else {
        if (standPat <= alpha) return alpha;
        if (standPat < beta) beta = standPat;
        
        const opponentColor = aiColor === 'white' ? 'black' : 'white';
        let captures = getCaptureMoves(board, opponentColor, gameState);
        captures.sort((a, b) => scoreMove(board, b, opponentColor) - scoreMove(board, a, opponentColor));
        
        for (const move of captures) {
            const { newBoard, newGameState } = applyMove(board, move, gameState);
            const val = quiescence(newBoard, alpha, beta, true, aiColor, newGameState);
            if (val <= alpha) return alpha;
            if (val < beta) beta = val;
        }
        return beta;
    }
}

// Minimax algorithm with alpha-beta pruning and transposition table
export function minimax(board, depth, alpha, beta, maximizingPlayer, aiColor, gameState = initialGameState, startTime = 0, timeLimit = 2000) {
    nodesEvaluated++;

    // Check time limit periodically to stop search early
    if (nodesEvaluated % 2048 === 0 && startTime > 0) {
        if (Date.now() - startTime > timeLimit) {
            return maximizingPlayer ? -Infinity : Infinity;
        }
    }

    if (depth === 0) {
        return quiescence(board, alpha, beta, maximizingPlayer, aiColor, gameState);
    }

    const currentPlayerColor = maximizingPlayer ? aiColor : (aiColor === 'white' ? 'black' : 'white');
    
    // Transposition Table lookup
    const boardHash = computeHash(board);
    const ttEntry = transpositionTable.get(boardHash);
    if (ttEntry && ttEntry.depth >= depth) {
        if (ttEntry.flag === 0) return ttEntry.value; // EXACT
        if (ttEntry.flag === 1 && ttEntry.value <= alpha) return alpha; // ALPHA
        if (ttEntry.flag === 2 && ttEntry.value >= beta) return beta; // BETA
    }

    let allPossibleMoves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            allPossibleMoves = allPossibleMoves.concat(getLegalMoves(board, r, c, currentPlayerColor, gameState));
        }
    }

    if (allPossibleMoves.length === 0) {
        const inCheck = isKingInCheck(board, currentPlayerColor, gameState);
        if (inCheck) {
            // Checkmate: return very bad score for maximizing player, good score for minimizing player
            return maximizingPlayer ? (-500000 - depth) : (500000 + depth);
        } else {
            // Stalemate: neutral score
            return 0;
        }
    }

    // Sort moves to evaluate high-impact moves first
    allPossibleMoves.sort((a, b) => scoreMove(board, b, currentPlayerColor) - scoreMove(board, a, currentPlayerColor));

    let bestValue = maximizingPlayer ? -Infinity : Infinity;
    let bestMove = null;

    if (maximizingPlayer) {
        for (const move of allPossibleMoves) {
            const { newBoard, newGameState } = applyMove(board, move, gameState);
            const evaluation = minimax(newBoard, depth - 1, alpha, beta, false, aiColor, newGameState, startTime, timeLimit);
            
            if (evaluation > bestValue) {
                bestValue = evaluation;
                bestMove = move;
            }
            alpha = Math.max(alpha, bestValue);
            if (beta <= alpha) {
                break; // Alpha-beta pruning
            }
        }
        
        // Save to Transposition Table
        let flag = 0; // EXACT
        if (bestValue <= alpha) flag = 1; // ALPHA
        else if (bestValue >= beta) flag = 2; // BETA
        transpositionTable.set(boardHash, { depth, value: bestValue, flag, bestMove });
        
        return bestValue;
    } else {
        for (const move of allPossibleMoves) {
            const { newBoard, newGameState } = applyMove(board, move, gameState);
            const evaluation = minimax(newBoard, depth - 1, alpha, beta, true, aiColor, newGameState, startTime, timeLimit);
            
            if (evaluation < bestValue) {
                bestValue = evaluation;
                bestMove = move;
            }
            beta = Math.min(beta, bestValue);
            if (beta <= alpha) {
                break; // Alpha-beta pruning
            }
        }
        
        // Save to Transposition Table
        let flag = 0; // EXACT
        if (bestValue <= alpha) flag = 1; // ALPHA
        else if (bestValue >= beta) flag = 2; // BETA
        transpositionTable.set(boardHash, { depth, value: bestValue, flag, bestMove });
        
        return bestValue;
    }
}

export function findBestMove(board, aiColor, gameState = initialGameState, maxDepth = 6) {
    const startTime = Date.now();
    const timeLimit = 2000; // 2 seconds search limit
    let bestMove = null;
    nodesEvaluated = 0;

    transpositionTable.clear();

    let allPossibleMoves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            allPossibleMoves = allPossibleMoves.concat(getLegalMoves(board, r, c, aiColor, gameState));
        }
    }

    if (allPossibleMoves.length === 0) return null;

    // Initial Move Ordering
    allPossibleMoves.sort((a, b) => scoreMove(board, b, aiColor) - scoreMove(board, a, aiColor));

    // Iterative Deepening Search
    for (let currentDepth = 1; currentDepth <= maxDepth; currentDepth++) {
        if (Date.now() - startTime > timeLimit) {
            break;
        }

        let bestValue = -Infinity;
        let depthBestMove = null;

        for (const move of allPossibleMoves) {
            const { newBoard, newGameState } = applyMove(board, move, gameState);
            const moveValue = minimax(newBoard, currentDepth - 1, -Infinity, Infinity, false, aiColor, newGameState, startTime, timeLimit);
            
            if (Date.now() - startTime > timeLimit && bestMove !== null) {
                break; // Ignore partial/incomplete search results on timeout
            }

            if (moveValue > bestValue) {
                bestValue = moveValue;
                depthBestMove = move;
            }
        }

        if (depthBestMove) {
            bestMove = depthBestMove;
            
            // Move Ordering Enhancement: prioritize the best move found in subsequent searches
            const idx = allPossibleMoves.indexOf(bestMove);
            if (idx > 0) {
                allPossibleMoves.splice(idx, 1);
                allPossibleMoves.unshift(bestMove);
            }
        }

        // Post status updates to Web Worker if active
        if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
            self.postMessage({
                status: 'searching',
                depth: currentDepth,
                nodes: nodesEvaluated,
                timeSpent: Date.now() - startTime
            });
        }
    }

    // Report final results to worker
    if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
        self.postMessage({
            status: 'complete',
            bestMove,
            depth: maxDepth,
            nodes: nodesEvaluated,
            timeSpent: Date.now() - startTime
        });
    }

    return bestMove;
}

// Interactive Learning Coach moves analyzer
export function analyzeMoves(board, moves, currentPlayerColor, gameState = initialGameState) {
    const currentEval = evaluateBoard(board, gameState);
    const analysisResults = {};

    moves.forEach(move => {
        // 1. Simulate the move
        const { newBoard, newGameState } = applyMove(board, move, gameState);
        
        // 2. Perform a fast minimax search at depth 2 to see the future value
        const moveValue = minimax(newBoard, 2, -Infinity, Infinity, false, currentPlayerColor, newGameState);
        
        // 3. Calculate evaluation difference relative to current board
        // Current player wants to maximize their score.
        // For white, high is good. For black, we already normalized so positive is always good for AI.
        // But for the human (White), the evaluation is raw, so high is good.
        // Let's adjust so that a positive diff always represents a good move!
        let diff = moveValue - currentEval;
        
        let grade = 'yellow'; // default
        let title = 'Inaccuracy';
        let color = 'coach-yellow';
        
        if (diff >= -15) {
            grade = 'green';
            title = 'Excellent Move';
            color = 'coach-green';
        } else if (diff < -15 && diff >= -120) {
            grade = 'yellow';
            title = 'Inaccuracy';
            color = 'coach-yellow';
        } else {
            grade = 'red';
            title = 'Blunder / Mistake';
            color = 'coach-red';
        }
        
        // 4. Generate natural language explanation
        const explanation = generateExplanation(board, newBoard, move, newGameState, currentPlayerColor, grade);
        
        analysisResults[`${move.endRow},${move.endCol}`] = {
            grade,
            title,
            color,
            evalDiff: (diff / 100).toFixed(2), // Convert to standard pawn units
            explanation
        };
    });

    return analysisResults;
}

function hasAnyLegalMoves(boardState, playerColor, gameState) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = boardState[r][c];
            if (piece !== ' ' && getPieceColor(piece) === playerColor) {
                const moves = getLegalMoves(boardState, r, c, playerColor, gameState);
                if (moves.length > 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

function generateExplanation(board, newBoard, move, newGameState, playerColor, grade) {
    const pieceChar = board[move.startRow][move.startCol];
    const pieceName = getPieceName(pieceChar);
    const opponentColor = playerColor === 'white' ? 'black' : 'white';
    
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    const destSquare = `${files[move.endCol]}${ranks[move.endRow]}`;

    // 1. Checkmate deliver
    const opponentHasMoves = hasAnyLegalMoves(newBoard, opponentColor, newGameState);
    const opponentInCheck = isKingInCheck(newBoard, opponentColor, newGameState);
    if (!opponentHasMoves && opponentInCheck) {
        return `💥 CHECKMATE! This move delivers immediate checkmate on ${destSquare} and wins the battle!`;
    }

    // 2. Castling
    if (move.isCastling) {
        return `🛡️ CASTLING! Secures your King in a safe bunker and activates your Rook for active combat.`;
    }

    // 3. Check deliver
    if (opponentInCheck) {
        return `⚔️ DELIVERS CHECK! Forces the opponent's King under direct fire, disrupting their tactical coordination.`;
    }

    // 4. Piece promotion
    if (pieceChar.toUpperCase() === 'P' && (move.endRow === 0 || move.endRow === 7)) {
        return `👑 PROMOTION! Promotes your brave Pawn into a dominant Queen on the back rank!`;
    }

    // 5. Hanging piece warning (Blunder)
    const isDefended = isFriendlyDefended(newBoard, move.endRow, move.endCol, playerColor, newGameState);
    const isAttacked = isSquareAttacked(newBoard, move.endRow, move.endCol, opponentColor, newGameState);
    
    if (isAttacked && !isDefended && grade === 'red') {
        return `⚠️ BLUNDER! Leaves your ${pieceName} completely undefended and hanging on ${destSquare}. The opponent can capture it for free!`;
    }

    // 6. Capture moves
    const capturedPiece = board[move.endRow][move.endCol];
    if (capturedPiece !== ' ') {
        const capturedName = getPieceName(capturedPiece);
        if (grade === 'green') {
            return `🎯 CAPTURE! Snipes the opponent's undefended or high-value ${capturedName} on ${destSquare}, securing a major material advantage!`;
        }
        return `Capture of the opponent's ${capturedName} on ${destSquare}. Be cautious of possible tactical counter-strikes.`;
    }

    // 7. Pushing King shield pawns
    if (pieceChar.toUpperCase() === 'P' && move.startRow === 6 && playerColor === 'white') {
        const kingPos = findKing(board, 'white');
        if (kingPos && kingPos[0] === 7 && ((kingPos[1] >= 5 && move.startCol >= 5) || (kingPos[1] <= 2 && move.startCol <= 2))) {
            return `⚠️ WEAKENS KING SHIELD! Pushing this pawn weakens the protective fortress around your castled King.`;
        }
    }

    // 8. General positional moves
    if (grade === 'green') {
        return `📈 EXCELLENT MOVE! Develops your ${pieceName} to ${destSquare}, improving its positional activity and controlling critical squares.`;
    }

    if (grade === 'yellow') {
        return `⚖️ SAFE MOVE. Moves the ${pieceName} to ${destSquare}. It is safe, but there might be more active positional opportunities available.`;
    }

    return `⚠️ RISK DETECTED. Moving the ${pieceName} to ${destSquare} weakens your position or concedes some control to the opponent.`;
}

function getPieceName(pieceChar) {
    const names = {
        'P': 'Pawn', 'N': 'Knight', 'B': 'Bishop', 'R': 'Rook', 'Q': 'Queen', 'K': 'King',
        'p': 'Pawn', 'n': 'Knight', 'b': 'Bishop', 'r': 'Rook', 'q': 'Queen', 'k': 'King'
    };
    return names[pieceChar] || 'Piece';
}
