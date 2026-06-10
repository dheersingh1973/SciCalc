const { evaluate, tokenize, factorial } = require('./calculator.js');

describe('Factorial Helper Function', () => {
    test('calculates factorial for non-negative integers', () => {
        expect(factorial(0)).toBe(1);
        expect(factorial(1)).toBe(1);
        expect(factorial(5)).toBe(120);
    });

    test('returns NaN for negative numbers and non-integers', () => {
        expect(factorial(-1)).toBeNaN();
        expect(factorial(2.5)).toBeNaN();
    });
});

describe('Tokenizer & Implicit Multiplication', () => {
    test('tokenizes basic expression', () => {
        const tokens = tokenize('2 + 3');
        expect(tokens).toHaveLength(3);
        expect(tokens[0]).toEqual({ type: 'NUMBER', value: 2 });
        expect(tokens[1]).toEqual({ type: 'OPERATOR', value: '+' });
        expect(tokens[2]).toEqual({ type: 'NUMBER', value: 3 });
    });

    test('inserts implicit multiplication between number and parenthesis', () => {
        const tokens = tokenize('2(3+4)');
        // 2 * ( 3 + 4 ) -> 7 tokens
        expect(tokens.map(t => t.value)).toEqual([2, '*', '(', 3, '+', 4, ')']);
    });

    test('inserts implicit multiplication between parentheses', () => {
        const tokens = tokenize('(2)(3)');
        expect(tokens.map(t => t.value)).toEqual(['(', 2, ')', '*', '(', 3, ')']);
    });

    test('inserts implicit multiplication with constants', () => {
        const tokens = tokenize('2pi');
        expect(tokens.map(t => t.value)).toEqual([2, '*', 'pi']);
    });

    test('inserts implicit multiplication after factorials', () => {
        const tokens = tokenize('3!2');
        expect(tokens.map(t => t.value)).toEqual([3, '!', '*', 2]);
    });
});

describe('Expression Evaluator', () => {
    test('handles basic arithmetic with precedence', () => {
        expect(evaluate('2 + 3 * 4')).toBe(14);
        expect(evaluate('(2 + 3) * 4')).toBe(20);
        expect(evaluate('10 - 5 - 2')).toBe(3);
        expect(evaluate('12 / 3 / 2')).toBe(2);
    });

    test('handles exponents and unary operators', () => {
        expect(evaluate('2^3')).toBe(8);
        expect(evaluate('2^3^2')).toBe(512); // Right-associative base case
        expect(evaluate('-5 + 3')).toBe(-2);
        expect(evaluate('-(3 + 4)')).toBe(-7);
        expect(evaluate('+5')).toBe(5);
    });

    test('handles constants', () => {
        expect(evaluate('pi')).toBeCloseTo(Math.PI, 10);
        expect(evaluate('e')).toBeCloseTo(Math.E, 10);
    });

    test('handles trigonometric functions in radians (default)', () => {
        expect(evaluate('sin(pi / 2)')).toBe(1);
        expect(evaluate('cos(pi)')).toBe(-1);
        expect(evaluate('tan(0)')).toBe(0);
    });

    test('handles trigonometric functions in degrees', () => {
        expect(evaluate('sin(90)', true)).toBe(1);
        expect(evaluate('cos(180)', true)).toBe(-1);
        expect(evaluate('tan(45)', true)).toBe(1);
    });

    test('handles inverse trig functions', () => {
        expect(evaluate('asin(1)', false)).toBeCloseTo(Math.PI / 2, 10);
        expect(evaluate('asin(1)', true)).toBe(90);
        expect(evaluate('acos(0)', false)).toBeCloseTo(Math.PI / 2, 10);
        expect(evaluate('acos(0)', true)).toBe(90);
        expect(evaluate('atan(1)', false)).toBeCloseTo(Math.PI / 4, 10);
        expect(evaluate('atan(1)', true)).toBe(45);
    });

    test('handles logarithms and exponentials', () => {
        expect(evaluate('ln(e)')).toBe(1);
        expect(evaluate('log10(100)')).toBe(2);
        expect(evaluate('exp(1)')).toBeCloseTo(Math.E, 10);
        expect(evaluate('sqrt(16)')).toBe(4);
    });

    test('handles factorials', () => {
        expect(evaluate('5!')).toBe(120);
        expect(evaluate('(2+3)!')).toBe(120);
    });

    test('throws division by zero errors', () => {
        expect(() => evaluate('5 / 0')).toThrow('Division by zero');
        expect(() => evaluate('5 / (2 - 2)')).toThrow('Division by zero');
    });

    test('throws error for mismatched parentheses', () => {
        expect(() => evaluate('(2 + 3')).toThrow("Mismatched parentheses");
        expect(() => evaluate('2 + 3)')).toThrow();
    });

    test('throws error for invalid scientific function arguments', () => {
        expect(() => evaluate('sqrt(-1)')).toThrow('Invalid input for sqrt');
        expect(() => evaluate('ln(0)')).toThrow('Invalid input for ln');
        expect(() => evaluate('asin(2)')).toThrow('Invalid input for asin');
    });
});
