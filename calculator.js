/**
 * Scientific Calculator - core logic and DOM interactions
 */

// Math Helper functions
const factorial = (n) => {
    try {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    if (!Number.isInteger(n)) {
        // Gamma function approximation for non-integers or just return NaN for simplicity
            throw new Error("Factorial is not defined for non-integer values.");
    }
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
    } catch (error) {
        console.error(error);
        return NaN;
    }
};

// Main Expression Evaluator using Recursive Descent Parser
class ExpressionParser {
    constructor(tokens, isDegree = false) {
        this.tokens = tokens;
        this.index = 0;
        this.isDegree = isDegree;
    }

    peek() {
        return this.tokens[this.index] || null;
    }

    get() {
        return this.tokens[this.index++];
    }

    match(type, value) {
        const token = this.peek();
        if (token && token.type === type && (value === undefined || token.value === value)) {
            this.get();
            return token;
        }
        return null;
    }

    parse() {
        const result = this.expression();
        if (this.peek() !== null) {
            throw new Error('Unexpected tokens at end of expression');
        }
        return result;
    }

    // Expression -> Term (( '+' | '-' ) Term)*
    expression() {
        let val = this.term();
        while (true) {
            if (this.match('OPERATOR', '+')) {
                val += this.term();
            } else if (this.match('OPERATOR', '-')) {
                val -= this.term();
            } else {
                break;
            }
        }
        return val;
    }

    // Term -> Factor (( '*' | '/' ) Factor)*
    term() {
        let val = this.factor();
        while (true) {
            if (this.match('OPERATOR', '*')) {
                val *= this.factor();
            } else if (this.match('OPERATOR', '/')) {
                const denom = this.factor();
                if (denom === 0) {
                    throw new Error('Division by zero');
                }
                val /= denom;
            } else {
                break;
            }
        }
        return val;
    }

    // Factor -> Base ('^' Factor)*
    factor() {
        let val = this.base();
        if (this.match('OPERATOR', '^')) {
            const power = this.factor();
            val = Math.pow(val, power);
        }
        return val;
    }

    // Base -> Unary | FactorialBase
    base() {
        let val;
        const next = this.peek();
        
        if (next && next.type === 'OPERATOR' && (next.value === '+' || next.value === '-')) {
            const op = this.get().value;
            const unaryVal = this.base();
            val = op === '-' ? -unaryVal : unaryVal;
        } else {
            val = this.primary();
        }

        // Handle Factorial right-associativity / suffix
        while (this.match('OPERATOR', '!')) {
            val = factorial(val);
        }

        return val;
    }

    // Primary -> Number | Constant | Function | Parentheses
    primary() {
        const token = this.peek();
        if (!token) {
            throw new Error('Unexpected end of expression');
        }

        if (token.type === 'NUMBER') {
            return this.get().value;
        }

        if (token.type === 'IDENTIFIER') {
            const name = this.get().value;
            // Constant lookup
            if (name === 'pi' || name === 'π') {
                return Math.PI;
            }
            if (name === 'e') {
                return Math.E;
            }

            // Function lookup
            const funcs = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'ln', 'log10', 'log', 'sqrt', 'exp'];
            if (funcs.includes(name)) {
                if (!this.match('OPERATOR', '(')) {
                    throw new Error(`Expected '(' after function ${name}`);
                }
                const arg = this.expression();
                if (!this.match('OPERATOR', ')')) {
                    throw new Error(`Expected ')' after argument of ${name}`);
                }

                switch (name) {
                    case 'sin':
                        return Math.sin(this.isDegree ? arg * Math.PI / 180 : arg);
                    case 'cos':
                        return Math.cos(this.isDegree ? arg * Math.PI / 180 : arg);
                    case 'tan': {
                        const val = this.isDegree ? arg * Math.PI / 180 : arg;
                        // Avoid infinity issues with tan(90)
                        if (this.isDegree && Math.abs((arg % 180) - 90) < 1e-9) {
                            throw new Error('Tangent undefined');
                        }
                        return Math.tan(val);
                    }
                    case 'asin': {
                        if (arg < -1 || arg > 1) throw new Error('Invalid input for asin');
                        const res = Math.asin(arg);
                        return this.isDegree ? res * 180 / Math.PI : res;
                    }
                    case 'acos': {
                        if (arg < -1 || arg > 1) throw new Error('Invalid input for acos');
                        const res = Math.acos(arg);
                        return this.isDegree ? res * 180 / Math.PI : res;
                    }
                    case 'atan': {
                        const res = Math.atan(arg);
                        return this.isDegree ? res * 180 / Math.PI : res;
                    }
                    case 'ln':
                        if (arg <= 0) throw new Error('Invalid input for ln');
                        return Math.log(arg);
                    case 'log':
                    case 'log10':
                        if (arg <= 0) throw new Error('Invalid input for log');
                        return Math.log10(arg);
                    case 'sqrt':
                        if (arg < 0) throw new Error('Invalid input for sqrt');
                        return Math.sqrt(arg);
                    case 'exp':
                        return Math.exp(arg);
                    default:
                        throw new Error(`Unknown function ${name}`);
                }
            }
            throw new Error(`Unknown identifier ${name}`);
        }

        if (this.match('OPERATOR', '(')) {
            const val = this.expression();
            if (!this.match('OPERATOR', ')')) {
                throw new Error("Mismatched parentheses - missing ')'");
            }
            return val;
        }

        throw new Error(`Unexpected token: ${token.value}`);
    }
}

// Tokenizer with implicit multiplication handling
function tokenize(str) {
    const tokens = [];
    let i = 0;
    while (i < str.length) {
        let c = str[i];
        if (/\s/.test(c)) {
            i++;
            continue;
        }
        
        // Match numbers (including decimals)
        if (/[0-9.]/.test(c)) {
            let numStr = '';
            while (i < str.length && /[0-9.]/.test(str[i])) {
                numStr += str[i];
                i++;
            }
            if ((numStr.match(/\./g) || []).length > 1) {
                throw new Error('Invalid number format: multiple decimal points');
            }
            tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
            continue;
        }

        // Match alphabetic identifiers (functions, constants)
        if (/[a-zA-Zπ]/.test(c)) {
            let idStr = '';
            while (i < str.length && /[a-zA-Z0-9π]/.test(str[i])) {
                idStr += str[i];
                i++;
            }
            tokens.push({ type: 'IDENTIFIER', value: idStr });
            continue;
        }

        // Match valid operators and parentheses
        if ('+-*/^!()'.indexOf(c) !== -1) {
            tokens.push({ type: 'OPERATOR', value: c });
            i++;
            continue;
        }

        throw new Error(`Invalid symbol: '${c}'`);
    }

    // Insert implicit multiplications where appropriate
    const processed = [];
    const functions = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'ln', 'log10', 'log', 'sqrt', 'exp'];
    
    for (let k = 0; k < tokens.length; k++) {
        const curr = tokens[k];
        processed.push(curr);
        
        if (k + 1 < tokens.length) {
            const next = tokens[k + 1];
            
            // Check situations requiring implicit multiplication:
            // 1. Number followed by identifier (e.g. 2pi, 3sin(x))
            // 2. Number followed by open parenthesis (e.g. 2(3+4))
            // 3. Constant identifier followed by identifier or parenthesis (e.g. pi e, pi(4))
            // 4. Close parenthesis followed by number, identifier, or open parenthesis (e.g. (2)3, (2)pi, (2)(3))
            
            const isCurrNum = curr.type === 'NUMBER';
            const isCurrConstantId = curr.type === 'IDENTIFIER' && !functions.includes(curr.value);
            const isCurrCloseParen = curr.type === 'OPERATOR' && curr.value === ')';
            const isCurrFactorial = curr.type === 'OPERATOR' && curr.value === '!';

            const isNextNum = next.type === 'NUMBER';
            const isNextId = next.type === 'IDENTIFIER';
            const isNextOpenParen = next.type === 'OPERATOR' && next.value === '(';

            let insertMult = false;

            if (isCurrNum && (isNextId || isNextOpenParen)) {
                insertMult = true;
            } else if (isCurrConstantId && (isNextId || isNextOpenParen || isNextNum)) {
                insertMult = true;
            } else if (isCurrCloseParen && (isNextNum || isNextId || isNextOpenParen)) {
                insertMult = true;
            } else if (isCurrFactorial && (isNextNum || isNextId || isNextOpenParen)) {
                insertMult = true;
            }

            if (insertMult) {
                processed.push({ type: 'OPERATOR', value: '*' });
            }
        }
    }

    return processed;
}

// Complete evaluate function wrapping Tokenizer & Parser
function evaluate(expressionStr, isDegree = false) {
    // Basic symbol normalization
    let cleanStr = expressionStr
        .replace(/÷/g, '/')
        .replace(/×/g, '*')
        .replace(/−/g, '-')
        .replace(/π/g, 'pi');
    
    if (!cleanStr.trim()) {
        return 0;
    }

    const tokens = tokenize(cleanStr);
    const parser = new ExpressionParser(tokens, isDegree);
    const result = parser.parse();
    
    if (isNaN(result) || !isFinite(result)) {
        throw new Error('Invalid calculation result');
    }
    
    // Round to handle floating point issues gracefully (e.g., 0.1 + 0.2 = 0.3)
    return Math.round(result * 1e12) / 1e12;
}

// Only execute UI binding if in browser environment
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const display = document.getElementById('display');
        const formulaDisplay = document.getElementById('formula-display');
        const degRadIndicator = document.getElementById('deg-rad-indicator');
        const memoryIndicator = document.getElementById('memory-indicator');
        const historyPanel = document.getElementById('history-panel');
        const calculatorLayout = document.querySelector('.calculator-layout');
        const historyList = document.getElementById('history-list');

        let isDegreeMode = false;
        let memoryValue = 0;
        let currentFormula = '';
        let currentInput = '0';
        let overwriteOnNextInput = false;

        // Retrieve and build History from localStorage
        let history = JSON.parse(localStorage.getItem('calc_history') || '[]');

        function updateDisplay() {
            display.innerText = currentInput;
            formulaDisplay.innerText = currentFormula;
            
            // Setup ARIA-labels for screen readers
            display.setAttribute('aria-label', `Result: ${currentInput}`);
            formulaDisplay.setAttribute('aria-label', `Formula: ${currentFormula || 'empty'}`);
        }

        function saveHistory() {
            localStorage.setItem('calc_history', JSON.stringify(history));
            renderHistory();
        }

        function renderHistory() {
            if (history.length === 0) {
                historyList.innerHTML = '<div class="no-history">No calculations yet</div>';
                return;
            }

            historyList.innerHTML = '';
            history.forEach((item, idx) => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                historyItem.setAttribute('tabindex', '0');
                historyItem.setAttribute('aria-label', `History item: ${item.formula} equals ${item.result}`);
                historyItem.innerHTML = `
                    <div class="history-item-expr">${item.formula}</div>
                    <div class="history-item-res">${item.result}</div>
                `;

                // Restore history item upon click or Enter key
                const restoreHistory = () => {
                    currentFormula = item.formula;
                    currentInput = String(item.result);
                    overwriteOnNextInput = true;
                    updateDisplay();
                };

                historyItem.addEventListener('click', restoreHistory);
                historyItem.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        restoreHistory();
                    }
                });

                historyList.appendChild(historyItem);
            });
        }

        // Handle generic button clicks
        function handleInput(val) {
            if (overwriteOnNextInput) {
                // If we just got a result, typing a new number or function replaces it, but an operator appends to it
                if (/[0-9.piπe(]/.test(val) || ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'ln', 'log10', 'exp', 'sqrt'].includes(val)) {
                    currentInput = '';
                    currentFormula = '';
                } else if (['+', '-', '*', '/', '^', '!'].includes(val)) {
                    currentFormula = currentInput;
                }
                overwriteOnNextInput = false;
            }

            const functions = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'ln', 'log10', 'exp', 'sqrt'];
            
            if (functions.includes(val)) {
                // Append function with starting parenthesis
                currentFormula += val + '(';
            } else if (val === 'pi') {
                currentFormula += 'π';
            } else {
                currentFormula += val;
            }

            // Realtime preview of calculations to display or just update formula
            try {
                // Remove trailing operator preview to avoid error on incomplete typing
                let cleanFormula = currentFormula.trim();
                if (cleanFormula && !['+', '-', '*', '/', '^', '('].includes(cleanFormula[cleanFormula.length - 1])) {
                    const tempRes = evaluate(cleanFormula, isDegreeMode);
                    currentInput = String(tempRes);
                }
            } catch (e) {
                // Do nothing for real-time previews if expression is incomplete
            }

            updateDisplay();
        }

        // Perform Calculation
        function calculate() {
            if (!currentFormula) return;
            try {
                const finalResult = evaluate(currentFormula, isDegreeMode);
                const formulaToSave = currentFormula;
                
                currentInput = String(finalResult);
                currentFormula = formulaToSave; // Keep full formula displayed
                overwriteOnNextInput = true;

                // Save to history
                history.unshift({ formula: formulaToSave, result: finalResult });
                if (history.length > 50) history.pop(); // Cap history to 50 items
                saveHistory();
                
            } catch (error) {
                currentInput = 'Error';
                formulaDisplay.innerText = error.message || 'Error';
                overwriteOnNextInput = true;
            }
            updateDisplay();
        }

        // AC (All Clear)
        function clearAll() {
            currentFormula = '';
            currentInput = '0';
            overwriteOnNextInput = false;
            updateDisplay();
        }

        // Backspace
        function handleBackspace() {
            if (overwriteOnNextInput) {
                clearAll();
                return;
            }

            if (currentFormula.length > 0) {
                // Check if we are deleting a function name (like 'asin(', 'sin(' etc)
                const funcs = ['asin(', 'acos(', 'atan(', 'sin(', 'cos(', 'tan(', 'ln(', 'log10(', 'exp(', 'sqrt('];
                let deletedFunc = false;
                for (let f of funcs) {
                    if (currentFormula.endsWith(f)) {
                        currentFormula = currentFormula.slice(0, -f.length);
                        deletedFunc = true;
                        break;
                    }
                }
                if (!deletedFunc) {
                    currentFormula = currentFormula.slice(0, -1);
                }
            }

            if (!currentFormula) {
                currentInput = '0';
            } else {
                try {
                    let cleanFormula = currentFormula.trim();
                    if (cleanFormula && !['+', '-', '*', '/', '^', '('].includes(cleanFormula[cleanFormula.length - 1])) {
                        currentInput = String(evaluate(cleanFormula, isDegreeMode));
                    }
                } catch (e) {
                    // Do nothing
                }
            }
            updateDisplay();
        }

        // Memory Handling
        function handleMemory(op) {
            try {
                const currentVal = parseFloat(currentInput) || 0;
                switch (op) {
                    case 'MC':
                        memoryValue = 0;
                        memoryIndicator.classList.add('hidden');
                        break;
                    case 'MR':
                        currentFormula += String(memoryValue);
                        currentInput = String(memoryValue);
                        break;
                    case 'M+':
                        memoryValue += currentVal;
                        memoryIndicator.classList.remove('hidden');
                        overwriteOnNextInput = true;
                        break;
                    case 'M-':
                        memoryValue -= currentVal;
                        memoryIndicator.classList.remove('hidden');
                        overwriteOnNextInput = true;
                        break;
                }
                updateDisplay();
            } catch (e) {
                currentInput = 'Error';
                updateDisplay();
            }
        }

        // Theme Toggle (High Contrast support)
        const themeBtn = document.getElementById('theme-toggle');
        let isHighContrast = localStorage.getItem('theme_hc') === 'true';

        function applyTheme() {
            if (isHighContrast) {
                document.body.className = 'theme-high-contrast';
                themeBtn.setAttribute('aria-pressed', 'true');
            } else {
                document.body.className = 'theme-light';
                themeBtn.setAttribute('aria-pressed', 'false');
            }
        }

        themeBtn.addEventListener('click', () => {
            isHighContrast = !isHighContrast;
            localStorage.setItem('theme_hc', isHighContrast);
            applyTheme();
        });

        // History Sidebar Toggle
        const historyBtn = document.getElementById('history-toggle');
        historyBtn.addEventListener('click', () => {
            const isExpanded = calculatorLayout.classList.toggle('has-history');
            historyBtn.setAttribute('aria-expanded', isExpanded);
            historyPanel.setAttribute('aria-hidden', !isExpanded);
        });

        // Clear History
        document.getElementById('clear-history').addEventListener('click', () => {
            history = [];
            saveHistory();
        });

        // DEG/RAD Toggle
        document.getElementById('deg-rad-toggle').addEventListener('click', () => {
            isDegreeMode = !isDegreeMode;
            degRadIndicator.innerText = isDegreeMode ? 'DEG' : 'RAD';
            degRadIndicator.setAttribute('aria-label', `Mode is now ${isDegreeMode ? 'Degrees' : 'Radians'}`);
        });

        // AC and Backspace bindings
        document.getElementById('clear-all').addEventListener('click', clearAll);
        document.getElementById('backspace').addEventListener('click', handleBackspace);

        // Grid buttons click handling
        document.querySelectorAll('#buttons-grid .btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const val = e.currentTarget.getAttribute('data-val');
                
                if (val === '=') {
                    calculate();
                } else if (['MC', 'MR', 'M+', 'M-'].includes(val)) {
                    handleMemory(val);
                } else {
                    handleInput(val);
                }
            });
        });

        // Keyboard support
        document.addEventListener('keydown', (e) => {
            // Avoid capturing input if target is a control button or history item
            if (document.activeElement && (document.activeElement.classList.contains('control-btn') || document.activeElement.classList.contains('history-item'))) {
                if (e.key === 'Enter') return; // let default event fire
            }

            const key = e.key;

            if (/[0-9.]/.test(key)) {
                handleInput(key);
            } else if (key === '+') {
                handleInput('+');
            } else if (key === '-') {
                handleInput('-');
            } else if (key === '*') {
                handleInput('*');
            } else if (key === '/') {
                e.preventDefault(); // Prevents quick find in Firefox
                handleInput('/');
            } else if (key === '^') {
                handleInput('^');
            } else if (key === '!') {
                handleInput('!');
            } else if (key === '(') {
                handleInput('(');
            } else if (key === ')') {
                handleInput(')');
            } else if (key === 'Enter' || key === '=') {
                e.preventDefault();
                calculate();
            } else if (key === 'Backspace') {
                e.preventDefault();
                handleBackspace();
            } else if (key === 'Escape') {
                e.preventDefault();
                clearAll();
            }
        });

        // Init App States
        applyTheme();
        renderHistory();
        updateDisplay();
    });
}

// Export functions for Jest Unit Testing (Node.js Environment)
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = {
        evaluate,
        tokenize,
        factorial,
        ExpressionParser
    };
}
