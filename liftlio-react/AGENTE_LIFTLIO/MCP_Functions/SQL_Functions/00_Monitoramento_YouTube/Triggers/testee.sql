/*
 * @description Função que realiza operações matemáticas básicas como uma calculadora
 * @author Não especificado
 * @date Não especificado
 * @version 1.0
 *
 * Esta função atua como uma calculadora, permitindo realizar cálculos matemáticos
 * básicos. Implementa operações fundamentais de matemática.
 */

CREATE OR REPLACE FUNCTION calculadora(
    num1 NUMERIC,
    operator CHARACTER,
    num2 NUMERIC
)
RETURNS NUMERIC AS
$$
BEGIN
    CASE operator
        WHEN '+' THEN RETURN num1 + num2;
        WHEN '-' THEN RETURN num1 - num2;
        WHEN '*' THEN RETURN num1 * num2;
        WHEN '/' THEN
            IF num2 = 0 THEN
                RAISE EXCEPTION 'Divisão por zero não é permitida';
            END IF;
            RETURN num1 / num2;
        ELSE
            RAISE EXCEPTION 'Operador inválido. Use +, -, * ou /';
    END CASE;
END;
$$ LANGUAGE plpgsql;

/* Exemplos de uso:
SELECT calculadora(10, '+', 5);  -- Retorna 15
SELECT calculadora(10, '-', 5);  -- Retorna 5
SELECT calculadora(10, '*', 5);  -- Retorna 50
SELECT calculadora(10, '/', 5);  -- Retorna 2
*/
