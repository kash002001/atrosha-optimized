use std::collections::HashSet;
use std::fmt;
use serde::{Serialize, Deserialize};

// --- primitive types ---

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum PrimitiveType {
    Amount,    // u64 — monetary values in smallest unit (cents/satoshi)
    AgentId,   // string identifier, hashed to field element in circuit
    Role,      // enum variant mapped to integer
    Timestamp, // u64 — unix seconds
    Target,    // string identifier, hashed for Merkle membership
    Score,     // fixed-point 0..10000 representing 0.0000..1.0000
    Counter,   // u64 — denial counts, attempt counts, etc
    Bool,      // 0 or 1
}

impl fmt::Display for PrimitiveType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Amount    => write!(f, "Amount"),
            Self::AgentId   => write!(f, "AgentId"),
            Self::Role      => write!(f, "Role"),
            Self::Timestamp => write!(f, "Timestamp"),
            Self::Target    => write!(f, "Target"),
            Self::Score     => write!(f, "Score"),
            Self::Counter   => write!(f, "Counter"),
            Self::Bool      => write!(f, "Bool"),
        }
    }
}

// --- role enum ---

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum AgentRole {
    Junior,
    Senior,
    Admin,
    Custom(String),
}

impl AgentRole {
    // deterministic mapping to field element for circuit encoding
    pub fn to_field_index(&self) -> u64 {
        match self {
            Self::Junior => 1,
            Self::Senior => 2,
            Self::Admin  => 3,
            Self::Custom(s) => {
                let mut h: u64 = 5381;
                for b in s.bytes() {
                    h = h.wrapping_mul(33).wrapping_add(b as u64);
                }
                h | 0x1000 // keep custom roles out of the reserved range
            }
        }
    }

    fn parse(s: &str) -> Self {
        match s {
            "junior" => Self::Junior,
            "senior" => Self::Senior,
            "admin"  => Self::Admin,
            other    => Self::Custom(other.to_string()),
        }
    }
}

// --- AST nodes ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Policy {
    pub name: String,
    pub rules: Vec<Rule>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rule {
    pub constraint: Constraint,
    pub span: Span, // source location for error reporting
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Span {
    pub line: usize,
    pub col: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Constraint {
    // comparisons
    Eq(Expr, Expr),
    Neq(Expr, Expr),
    Lte(Expr, Expr),
    Gte(Expr, Expr),
    Lt(Expr, Expr),
    Gt(Expr, Expr),

    // set operations
    In(Expr, SetExpr),
    NotIn(Expr, SetExpr),

    // boolean combinators
    And(Box<Constraint>, Box<Constraint>),
    Or(Box<Constraint>, Box<Constraint>),
    Not(Box<Constraint>),
    Implies(Box<Constraint>, Box<Constraint>),

    // temporal (bounded — for model checking integration in pillar 5)
    Within {
        condition: Box<Constraint>,
        duration_secs: u64,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Expr {
    // field access: agent.role, tx.amount, agent.daily_spent, etc
    Field(FieldPath),
    // literal values
    LitAmount(u64),
    LitRole(AgentRole),
    LitScore(u64), // fixed-point: 8500 = 0.8500
    LitCounter(u64),
    LitTimestamp(u64),
    LitBool(bool),
    // arithmetic
    Add(Box<Expr>, Box<Expr>),
    Sub(Box<Expr>, Box<Expr>),
    Mul(Box<Expr>, Box<Expr>),
    // function calls — causal_score, hash, etc
    FnCall { name: String, args: Vec<Expr> },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldPath {
    pub object: String,  // "agent", "tx", "org"
    pub field: String,   // "role", "amount", "daily_limit", etc
}

impl fmt::Display for FieldPath {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}.{}", self.object, self.field)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SetExpr {
    FieldSet(FieldPath),          // org.whitelist
    Literal(Vec<String>),         // ["api.stripe.com", "api.plaid.com"]
}

// --- parser ---

#[derive(Debug)]
pub struct ParseError {
    pub message: String,
    pub span: Span,
}

impl fmt::Display for ParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "line {}:{}: {}", self.span.line, self.span.col, self.message)
    }
}

#[derive(Clone)]
pub struct Lexer<'a> {
    input: &'a str,
    pos: usize,
    line: usize,
    col: usize,
}

pub fn parse(input: &str) -> Result<Policy, ParseError> {
    Parser::new(input)?.parse_policy()
}

#[derive(Debug, Clone, PartialEq)]
enum Token {
    Ident(String),
    NumLit(u64),
    FloatLit(f64),
    StrLit(String),
    Dot,
    Comma,
    LParen,
    RParen,
    LBrace,
    RBrace,
    LBracket,
    RBracket,
    Eq,        // ==
    Neq,       // !=
    Lte,       // <=
    Gte,       // >=
    Lt,        // <
    Gt,        // >
    Plus,
    Minus,
    Star,
    Arrow,     // ->
    // keywords
    KwPolicy,
    KwRequire,
    KwAnd,
    KwOr,
    KwNot,
    KwIn,
    KwImplies,
    KwWithin,
    KwTrue,
    KwFalse,
    Eof,
}

impl<'a> Lexer<'a> {
    fn new(input: &'a str) -> Self {
        Self { input, pos: 0, line: 1, col: 1 }
    }

    fn span(&self) -> Span {
        Span { line: self.line, col: self.col }
    }

    fn peek_char(&self) -> Option<char> {
        self.input[self.pos..].chars().next()
    }

    fn advance(&mut self) -> Option<char> {
        let c = self.peek_char()?;
        self.pos += c.len_utf8();
        if c == '\n' { self.line += 1; self.col = 1; } else { self.col += 1; }
        Some(c)
    }

    fn skip_ws_and_comments(&mut self) {
        loop {
            // whitespace
            while self.peek_char().map_or(false, |c| c.is_whitespace()) {
                self.advance();
            }
            // line comments
            if self.input[self.pos..].starts_with("//") {
                while self.peek_char().map_or(false, |c| c != '\n') {
                    self.advance();
                }
                continue;
            }
            break;
        }
    }

    fn next_token(&mut self) -> Result<(Token, Span), ParseError> {
        self.skip_ws_and_comments();
        let sp = self.span();

        let c = match self.peek_char() {
            None => return Ok((Token::Eof, sp)),
            Some(c) => c,
        };

        // single/double char tokens
        match c {
            '.' => { self.advance(); return Ok((Token::Dot, sp)); }
            ',' => { self.advance(); return Ok((Token::Comma, sp)); }
            '(' => { self.advance(); return Ok((Token::LParen, sp)); }
            ')' => { self.advance(); return Ok((Token::RParen, sp)); }
            '{' => { self.advance(); return Ok((Token::LBrace, sp)); }
            '}' => { self.advance(); return Ok((Token::RBrace, sp)); }
            '[' => { self.advance(); return Ok((Token::LBracket, sp)); }
            ']' => { self.advance(); return Ok((Token::RBracket, sp)); }
            '+' => { self.advance(); return Ok((Token::Plus, sp)); }
            '*' => { self.advance(); return Ok((Token::Star, sp)); }
            '-' => {
                self.advance();
                if self.peek_char() == Some('>') {
                    self.advance();
                    return Ok((Token::Arrow, sp));
                }
                return Ok((Token::Minus, sp));
            }
            '=' => {
                self.advance();
                if self.peek_char() == Some('=') { self.advance(); return Ok((Token::Eq, sp)); }
                return Err(ParseError { message: "expected '==' not bare '='".into(), span: sp });
            }
            '!' => {
                self.advance();
                if self.peek_char() == Some('=') { self.advance(); return Ok((Token::Neq, sp)); }
                return Err(ParseError { message: "expected '!=' not bare '!'".into(), span: sp });
            }
            '<' => {
                self.advance();
                if self.peek_char() == Some('=') { self.advance(); return Ok((Token::Lte, sp)); }
                return Ok((Token::Lt, sp));
            }
            '>' => {
                self.advance();
                if self.peek_char() == Some('=') { self.advance(); return Ok((Token::Gte, sp)); }
                return Ok((Token::Gt, sp));
            }
            '"' => {
                self.advance(); // skip opening quote
                let start = self.pos;
                while self.peek_char().map_or(false, |ch| ch != '"') {
                    self.advance();
                }
                let val = self.input[start..self.pos].to_string();
                self.advance(); // skip closing quote
                return Ok((Token::StrLit(val), sp));
            }
            _ => {}
        }

        // numbers
        if c.is_ascii_digit() {
            let start = self.pos;
            while self.peek_char().map_or(false, |ch| ch.is_ascii_digit()) {
                self.advance();
            }
            // check for float
            if self.peek_char() == Some('.') {
                let dot_pos = self.pos;
                self.advance(); // consume dot
                if self.peek_char().map_or(false, |ch| ch.is_ascii_digit()) {
                    while self.peek_char().map_or(false, |ch| ch.is_ascii_digit()) {
                        self.advance();
                    }
                    let val: f64 = self.input[start..self.pos].parse().map_err(|_| ParseError {
                        message: "invalid float literal".into(), span: sp,
                    })?;
                    return Ok((Token::FloatLit(val), sp));
                }
                // not a float, backtrack the dot
                self.pos = dot_pos;
                self.col -= 1;
            }
            let val: u64 = self.input[start..self.pos].parse().map_err(|_| ParseError {
                message: "integer literal out of range".into(), span: sp,
            })?;
            return Ok((Token::NumLit(val), sp));
        }

        // identifiers + keywords
        if c.is_ascii_alphabetic() || c == '_' {
            let start = self.pos;
            while self.peek_char().map_or(false, |ch| ch.is_ascii_alphanumeric() || ch == '_') {
                self.advance();
            }
            let word = &self.input[start..self.pos];
            let tok = match word {
                "policy"  => Token::KwPolicy,
                "require" => Token::KwRequire,
                "and"     => Token::KwAnd,
                "or"      => Token::KwOr,
                "not"     => Token::KwNot,
                "IN"      => Token::KwIn,
                "implies" => Token::KwImplies,
                "within"  => Token::KwWithin,
                "true"    => Token::KwTrue,
                "false"   => Token::KwFalse,
                _         => Token::Ident(word.to_string()),
            };
            return Ok((tok, sp));
        }

        Err(ParseError { message: format!("unexpected character '{}'", c), span: sp })
    }
}

// --- recursive descent parser ---

pub struct Parser<'a> {
    lexer: Lexer<'a>,
    current: Token,
    current_span: Span,
}

impl<'a> Parser<'a> {
    pub fn new(input: &'a str) -> Result<Self, ParseError> {
        let mut lexer = Lexer::new(input);
        let (tok, sp) = lexer.next_token()?;
        Ok(Self { lexer, current: tok, current_span: sp })
    }

    fn bump(&mut self) -> Result<(), ParseError> {
        let (tok, sp) = self.lexer.next_token()?;
        self.current = tok;
        self.current_span = sp;
        Ok(())
    }

    fn expect(&mut self, expected: &Token) -> Result<Span, ParseError> {
        if std::mem::discriminant(&self.current) == std::mem::discriminant(expected) {
            let sp = self.current_span;
            self.bump()?;
            Ok(sp)
        } else {
            Err(ParseError {
                message: format!("expected {:?}, got {:?}", expected, self.current),
                span: self.current_span,
            })
        }
    }

    fn eat_ident(&mut self) -> Result<(String, Span), ParseError> {
        match &self.current {
            Token::Ident(s) => {
                let val = s.clone();
                let sp = self.current_span;
                self.bump()?;
                Ok((val, sp))
            }
            other => Err(ParseError {
                message: format!("expected identifier, got {:?}", other),
                span: self.current_span,
            }),
        }
    }

    // --- top-level ---
    // policy <Name> { require ...; require ...; }
    pub fn parse_policy(&mut self) -> Result<Policy, ParseError> {
        self.expect(&Token::KwPolicy)?;
        let (name, _) = self.eat_ident()?;
        self.expect(&Token::LBrace)?;

        let mut rules = Vec::new();
        while self.current != Token::RBrace && self.current != Token::Eof {
            rules.push(self.parse_rule()?);
        }
        self.expect(&Token::RBrace)?;

        Ok(Policy { name, rules })
    }

    fn parse_rule(&mut self) -> Result<Rule, ParseError> {
        let sp = self.current_span;
        self.expect(&Token::KwRequire)?;
        let constraint = self.parse_constraint()?;
        Ok(Rule { constraint, span: sp })
    }

    // --- constraint parsing (boolean level) ---

    fn parse_constraint(&mut self) -> Result<Constraint, ParseError> {
        self.parse_implies()
    }

    fn parse_implies(&mut self) -> Result<Constraint, ParseError> {
        let mut left = self.parse_or()?;
        while self.current == Token::KwImplies {
            self.bump()?;
            let right = self.parse_or()?;
            left = Constraint::Implies(Box::new(left), Box::new(right));
        }
        Ok(left)
    }

    fn parse_or(&mut self) -> Result<Constraint, ParseError> {
        let mut left = self.parse_and()?;
        while self.current == Token::KwOr {
            self.bump()?;
            let right = self.parse_and()?;
            left = Constraint::Or(Box::new(left), Box::new(right));
        }
        Ok(left)
    }

    fn parse_and(&mut self) -> Result<Constraint, ParseError> {
        let mut left = self.parse_unary()?;
        while self.current == Token::KwAnd {
            self.bump()?;
            let right = self.parse_unary()?;
            left = Constraint::And(Box::new(left), Box::new(right));
        }
        Ok(left)
    }

    fn parse_unary(&mut self) -> Result<Constraint, ParseError> {
        if self.current == Token::KwNot {
            self.bump()?;
            let inner = self.parse_unary()?;
            return Ok(Constraint::Not(Box::new(inner)));
        }
        // within(duration) { constraint }
        if self.current == Token::KwWithin {
            self.bump()?;
            self.expect(&Token::LParen)?;
            let dur = match &self.current {
                Token::NumLit(n) => *n,
                _ => return Err(ParseError {
                    message: "within() expects a duration in seconds".into(),
                    span: self.current_span,
                }),
            };
            self.bump()?;
            self.expect(&Token::RParen)?;
            self.expect(&Token::LBrace)?;
            let inner = self.parse_constraint()?;
            self.expect(&Token::RBrace)?;
            return Ok(Constraint::Within { condition: Box::new(inner), duration_secs: dur });
        }
        self.parse_comparison()
    }

    fn parse_comparison(&mut self) -> Result<Constraint, ParseError> {
        // parenthesized sub-expression vs constraint (requires backtracking)
        if self.current == Token::LParen {
            let saved_lexer = self.lexer.clone();
            let saved_current = self.current.clone();
            let saved_span = self.current_span;

            self.bump()?;
            if let Ok(c) = self.parse_constraint() {
                if self.current == Token::RParen {
                    self.bump()?;
                    return Ok(c);
                }
            }
            
            // backtrack
            self.lexer = saved_lexer;
            self.current = saved_current;
            self.current_span = saved_span;
        }

        let left = self.parse_expr()?;

        // check for IN / NOT IN
        if self.current == Token::KwIn {
            self.bump()?;
            let set = self.parse_set_expr()?;
            return Ok(Constraint::In(left, set));
        }
        if self.current == Token::KwNot {
            self.bump()?;
            if self.current == Token::KwIn {
                self.bump()?;
                let set = self.parse_set_expr()?;
                return Ok(Constraint::NotIn(left, set));
            }
            return Err(ParseError {
                message: "expected 'IN' after 'not' in set expression".into(),
                span: self.current_span,
            });
        }

        let op = match &self.current {
            Token::Eq  => "eq",
            Token::Neq => "neq",
            Token::Lte => "lte",
            Token::Gte => "gte",
            Token::Lt  => "lt",
            Token::Gt  => "gt",
            _ => return Err(ParseError {
                message: format!("expected comparison operator, got {:?}", self.current),
                span: self.current_span,
            }),
        };
        self.bump()?;
        let right = self.parse_expr()?;

        Ok(match op {
            "eq"  => Constraint::Eq(left, right),
            "neq" => Constraint::Neq(left, right),
            "lte" => Constraint::Lte(left, right),
            "gte" => Constraint::Gte(left, right),
            "lt"  => Constraint::Lt(left, right),
            "gt"  => Constraint::Gt(left, right),
            _     => unreachable!(),
        })
    }

    // --- expression parsing (arithmetic level) ---

    fn parse_expr(&mut self) -> Result<Expr, ParseError> {
        self.parse_additive()
    }

    fn parse_additive(&mut self) -> Result<Expr, ParseError> {
        let mut left = self.parse_multiplicative()?;
        loop {
            match &self.current {
                Token::Plus => {
                    self.bump()?;
                    let right = self.parse_multiplicative()?;
                    left = Expr::Add(Box::new(left), Box::new(right));
                }
                Token::Minus => {
                    self.bump()?;
                    let right = self.parse_multiplicative()?;
                    left = Expr::Sub(Box::new(left), Box::new(right));
                }
                _ => break,
            }
        }
        Ok(left)
    }

    fn parse_multiplicative(&mut self) -> Result<Expr, ParseError> {
        let mut left = self.parse_atom()?;
        while self.current == Token::Star {
            self.bump()?;
            let right = self.parse_atom()?;
            left = Expr::Mul(Box::new(left), Box::new(right));
        }
        Ok(left)
    }

    fn parse_atom(&mut self) -> Result<Expr, ParseError> {
        match &self.current {
            Token::NumLit(n) => {
                let val = *n;
                self.bump()?;
                Ok(Expr::LitAmount(val))
            }
            Token::FloatLit(f) => {
                // convert to fixed-point Score (0.85 -> 8500)
                let fixed = (*f * 10000.0) as u64;
                self.bump()?;
                Ok(Expr::LitScore(fixed))
            }
            Token::StrLit(s) => {
                let role = AgentRole::parse(s);
                self.bump()?;
                Ok(Expr::LitRole(role))
            }
            Token::KwTrue => {
                self.bump()?;
                Ok(Expr::LitBool(true))
            }
            Token::KwFalse => {
                self.bump()?;
                Ok(Expr::LitBool(false))
            }
            Token::Ident(_) => {
                let (obj, _) = self.eat_ident()?;

                // function call: name(arg1, arg2, ...)
                if self.current == Token::LParen {
                    self.bump()?;
                    let mut args = Vec::new();
                    while self.current != Token::RParen {
                        args.push(self.parse_expr()?);
                        if self.current == Token::Comma { self.bump()?; }
                    }
                    self.expect(&Token::RParen)?;
                    return Ok(Expr::FnCall { name: obj, args });
                }

                // field access: object.field
                if self.current == Token::Dot {
                    self.bump()?;
                    let (field, _) = self.eat_ident()?;
                    return Ok(Expr::Field(FieldPath { object: obj, field }));
                }

                // bare identifier — treat as zero-arg field (shorthand)
                Ok(Expr::Field(FieldPath { object: obj, field: String::new() }))
            }
            Token::LParen => {
                self.bump()?;
                let e = self.parse_expr()?;
                self.expect(&Token::RParen)?;
                Ok(e)
            }
            other => Err(ParseError {
                message: format!("unexpected token in expression: {:?}", other),
                span: self.current_span,
            }),
        }
    }

    fn parse_set_expr(&mut self) -> Result<SetExpr, ParseError> {
        // literal set: ["a", "b", "c"]
        if self.current == Token::LBracket {
            self.bump()?;
            let mut items = Vec::new();
            while self.current != Token::RBracket {
                match &self.current {
                    Token::StrLit(s) => {
                        items.push(s.clone());
                        self.bump()?;
                    }
                    _ => return Err(ParseError {
                        message: "expected string literal in set".into(),
                        span: self.current_span,
                    }),
                }
                if self.current == Token::Comma { self.bump()?; }
            }
            self.expect(&Token::RBracket)?;
            return Ok(SetExpr::Literal(items));
        }

        // field set: org.whitelist
        let (obj, _) = self.eat_ident()?;
        self.expect(&Token::Dot)?;
        let (field, _) = self.eat_ident()?;
        Ok(SetExpr::FieldSet(FieldPath { object: obj, field }))
    }
}

// --- validation ---

#[derive(Debug)]
pub struct ValidationError {
    pub message: String,
    pub span: Span,
}

impl fmt::Display for ValidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "validation error at {}:{}: {}", self.span.line, self.span.col, self.message)
    }
}

// known objects and their fields with types
fn known_schema() -> Vec<(&'static str, &'static str, PrimitiveType)> {
    vec![
        ("agent", "role",              PrimitiveType::Role),
        ("agent", "daily_limit",       PrimitiveType::Amount),
        ("agent", "per_tx_limit",      PrimitiveType::Amount),
        ("agent", "daily_spent",       PrimitiveType::Amount),
        ("agent", "consecutive_denials", PrimitiveType::Counter),
        ("agent", "is_suspended",      PrimitiveType::Bool),
        ("agent", "is_active",         PrimitiveType::Bool),
        ("tx",    "amount",            PrimitiveType::Amount),
        ("tx",    "target",            PrimitiveType::Target),
        ("tx",    "timestamp",         PrimitiveType::Timestamp),
        ("tx",    "supervisor_approved", PrimitiveType::Bool),
        ("org",   "whitelist",         PrimitiveType::Target), // set context
        ("org",   "blacklist",         PrimitiveType::Target),
    ]
}

pub fn validate_policy(policy: &Policy) -> Result<(), Vec<ValidationError>> {
    let schema = known_schema();
    let valid_fields: HashSet<(&str, &str)> = schema.iter().map(|(o, f, _)| (*o, *f)).collect();
    let mut errors = Vec::new();

    if policy.rules.is_empty() {
        errors.push(ValidationError {
            message: "policy has zero rules — nothing to prove".into(),
            span: Span { line: 1, col: 1 },
        });
    }

    for rule in &policy.rules {
        validate_constraint(&rule.constraint, rule.span, &valid_fields, &schema, &mut errors);
    }

    if errors.is_empty() { Ok(()) } else { Err(errors) }
}

fn validate_constraint(
    c: &Constraint,
    sp: Span,
    fields: &HashSet<(&str, &str)>,
    schema: &[(&str, &str, PrimitiveType)],
    errors: &mut Vec<ValidationError>,
) {
    match c {
        Constraint::Eq(l, r) | Constraint::Neq(l, r)
        | Constraint::Lte(l, r) | Constraint::Gte(l, r)
        | Constraint::Lt(l, r) | Constraint::Gt(l, r) => {
            validate_expr(l, sp, fields, errors);
            validate_expr(r, sp, fields, errors);

            // type compat check
            let lt = infer_type(l, schema);
            let rt = infer_type(r, schema);
            if let (Some(lt), Some(rt)) = (&lt, &rt) {
                if lt != rt {
                    let both_numeric = matches!(lt, PrimitiveType::Amount | PrimitiveType::Counter | PrimitiveType::Timestamp | PrimitiveType::Score)
                        && matches!(rt, PrimitiveType::Amount | PrimitiveType::Counter | PrimitiveType::Timestamp | PrimitiveType::Score);
                    let has_literal = matches!(l, Expr::LitAmount(_)) || matches!(r, Expr::LitAmount(_));

                    if !(both_numeric && has_literal) {
                        errors.push(ValidationError {
                            message: format!("type mismatch: cannot compare {} with {}", lt, rt),
                            span: sp,
                        });
                    }
                }
            }
        }
        Constraint::In(expr, _set) | Constraint::NotIn(expr, _set) => {
            validate_expr(expr, sp, fields, errors);
        }
        Constraint::And(a, b) | Constraint::Or(a, b) | Constraint::Implies(a, b) => {
            validate_constraint(a, sp, fields, schema, errors);
            validate_constraint(b, sp, fields, schema, errors);
        }
        Constraint::Not(inner) => {
            validate_constraint(inner, sp, fields, schema, errors);
        }
        Constraint::Within { condition, duration_secs } => {
            if *duration_secs == 0 {
                errors.push(ValidationError {
                    message: "within() duration must be > 0".into(),
                    span: sp,
                });
            }
            validate_constraint(condition, sp, fields, schema, errors);
        }
    }
}

fn validate_expr(
    e: &Expr,
    sp: Span,
    fields: &HashSet<(&str, &str)>,
    errors: &mut Vec<ValidationError>,
) {
    match e {
        Expr::Field(fp) => {
            if !fp.field.is_empty() && !fields.contains(&(fp.object.as_str(), fp.field.as_str())) {
                errors.push(ValidationError {
                    message: format!("unknown field: {}", fp),
                    span: sp,
                });
            }
        }
        Expr::Add(a, b) | Expr::Sub(a, b) | Expr::Mul(a, b) => {
            validate_expr(a, sp, fields, errors);
            validate_expr(b, sp, fields, errors);
        }
        Expr::FnCall { name, args } => {
            let allowed = ["causal_score", "hash", "abs"];
            if !allowed.contains(&name.as_str()) {
                errors.push(ValidationError {
                    message: format!("unknown function: {}()", name),
                    span: sp,
                });
            }
            for arg in args {
                validate_expr(arg, sp, fields, errors);
            }
        }
        // literals are always valid
        _ => {}
    }
}

fn infer_type(e: &Expr, schema: &[(&str, &str, PrimitiveType)]) -> Option<PrimitiveType> {
    match e {
        Expr::Field(fp) => {
            schema.iter()
                .find(|(o, f, _)| *o == fp.object.as_str() && *f == fp.field.as_str())
                .map(|(_, _, t)| t.clone())
        }
        Expr::LitAmount(_) => Some(PrimitiveType::Amount),
        Expr::LitRole(_) => Some(PrimitiveType::Role),
        Expr::LitScore(_) => Some(PrimitiveType::Score),
        Expr::LitCounter(_) => Some(PrimitiveType::Counter),
        Expr::LitTimestamp(_) => Some(PrimitiveType::Timestamp),
        Expr::LitBool(_) => Some(PrimitiveType::Bool),
        Expr::FnCall { name, .. } if name == "causal_score" => Some(PrimitiveType::Score),
        Expr::Add(a, _) | Expr::Sub(a, _) | Expr::Mul(a, _) => infer_type(a, schema),
        _ => None,
    }
}

// --- convenience: parse + validate in one shot ---

pub fn compile_policy(source: &str) -> Result<Policy, String> {
    let mut parser = Parser::new(source).map_err(|e| e.to_string())?;
    let policy = parser.parse_policy().map_err(|e| e.to_string())?;
    validate_policy(&policy).map_err(|errs| {
        errs.iter().map(|e| e.to_string()).collect::<Vec<_>>().join("\n")
    })?;
    Ok(policy)
}

// --- constraint cost estimator ---

pub fn estimate_constraints(policy: &Policy) -> usize {
    policy.rules.iter().map(|r| constraint_cost(&r.constraint)).sum()
}

fn constraint_cost(c: &Constraint) -> usize {
    match c {
        Constraint::Eq(_, _) | Constraint::Neq(_, _) => 1,
        Constraint::Lte(_, _) | Constraint::Gte(_, _)
        | Constraint::Lt(_, _) | Constraint::Gt(_, _) => 254, // binary decomposition
        Constraint::In(_, SetExpr::FieldSet(_)) => 5000, // merkle proof with poseidon, depth ~20
        Constraint::In(_, SetExpr::Literal(items)) => items.len(), // direct equality checks
        Constraint::NotIn(_, s) => {
            // slightly more expensive than In
            match s {
                SetExpr::FieldSet(_) => 5500,
                SetExpr::Literal(items) => items.len() * 2,
            }
        }
        Constraint::And(a, b) | Constraint::Or(a, b) => {
            constraint_cost(a) + constraint_cost(b) + 1
        }
        Constraint::Implies(a, b) => constraint_cost(a) + constraint_cost(b) + 2,
        Constraint::Not(inner) => constraint_cost(inner) + 1,
        Constraint::Within { condition, .. } => constraint_cost(condition) + 254, // timestamp comparison
    }
}

// --- unit tests ---

#[cfg(test)]
mod tests {
    use super::*;

    fn parse_ok(src: &str) -> Policy {
        compile_policy(src).expect(&format!("failed to parse:\n{}", src))
    }

    fn parse_fails(src: &str) {
        assert!(compile_policy(src).is_err(), "expected parse failure for:\n{}", src);
    }

    // ---- basic policies ----

    #[test]
    fn test_simple_amount_check() {
        let p = parse_ok(r#"
            policy SimpleLimit {
                require tx.amount <= agent.daily_limit
            }
        "#);
        assert_eq!(p.name, "SimpleLimit");
        assert_eq!(p.rules.len(), 1);
    }

    #[test]
    fn test_equality_check() {
        let p = parse_ok(r#"
            policy RoleCheck {
                require agent.role == "finance"
            }
        "#);
        assert_eq!(p.rules.len(), 1);
    }

    #[test]
    fn test_multiple_rules() {
        let p = parse_ok(r#"
            policy MultiRule {
                require agent.role == "admin"
                require tx.amount <= 50000
                require tx.target IN org.whitelist
            }
        "#);
        assert_eq!(p.rules.len(), 3);
    }

    #[test]
    fn test_set_membership() {
        parse_ok(r#"
            policy WhitelistOnly {
                require tx.target IN org.whitelist
            }
        "#);
    }

    #[test]
    fn test_literal_set() {
        parse_ok(r#"
            policy ExplicitTargets {
                require tx.target IN ["api.stripe.com", "api.plaid.com"]
            }
        "#);
    }

    #[test]
    fn test_not_in() {
        parse_ok(r#"
            policy Blacklisted {
                require tx.target not IN org.blacklist
            }
        "#);
    }

    // ---- boolean combinators ----

    #[test]
    fn test_and_combinator() {
        parse_ok(r#"
            policy Combined {
                require agent.role == "senior" and tx.amount <= 100000
            }
        "#);
    }

    #[test]
    fn test_or_combinator() {
        parse_ok(r#"
            policy EitherOr {
                require agent.role == "admin" or tx.amount <= 5000
            }
        "#);
    }

    #[test]
    fn test_not_combinator() {
        parse_ok(r#"
            policy NotSuspended {
                require not agent.is_suspended == true
            }
        "#);
    }

    #[test]
    fn test_implies() {
        parse_ok(r#"
            policy HighValueApproval {
                require tx.amount > 10000 implies tx.supervisor_approved == true
            }
        "#);
    }

    // ---- arithmetic ----

    #[test]
    fn test_addition_in_comparison() {
        parse_ok(r#"
            policy AccumulatedSpend {
                require agent.daily_spent + tx.amount <= agent.daily_limit
            }
        "#);
    }

    #[test]
    fn test_multiplication() {
        parse_ok(r#"
            policy DoubleLimit {
                require tx.amount <= agent.per_tx_limit * 2
            }
        "#);
    }

    // ---- function calls ----

    #[test]
    fn test_causal_score_function() {
        parse_ok(r#"
            policy IntentVerified {
                require causal_score(agent.role, tx.target) > 0.85
            }
        "#);
    }

    // ---- temporal ----

    #[test]
    fn test_within_temporal() {
        parse_ok(r#"
            policy TimeBounded {
                require within(300) {
                    tx.supervisor_approved == true
                }
            }
        "#);
    }

    // ---- full enterprise policy ----

    #[test]
    fn test_full_enterprise_policy() {
        let p = parse_ok(r#"
            policy InvoicePayment {
                require agent.role == "finance"
                require tx.amount <= agent.per_tx_limit
                require agent.daily_spent + tx.amount <= agent.daily_limit
                require tx.target IN org.whitelist
                require tx.target not IN org.blacklist
                require causal_score(agent.role, tx.target) > 0.85
                require not agent.is_suspended == true
                require tx.amount > 10000 implies tx.supervisor_approved == true
            }
        "#);
        assert_eq!(p.name, "InvoicePayment");
        assert_eq!(p.rules.len(), 8);

        let cost = estimate_constraints(&p);
        assert!(cost > 5000, "expected >5000 constraints, got {}", cost);
        assert!(cost < 15000, "expected <15000 constraints, got {}", cost);
    }

    // ---- validation failures ----

    #[test]
    fn test_unknown_field_rejected() {
        parse_fails(r#"
            policy Bad {
                require agent.nonexistent_field == 42
            }
        "#);
    }

    #[test]
    fn test_unknown_function_rejected() {
        parse_fails(r#"
            policy Bad {
                require evil_fn(tx.amount) > 0
            }
        "#);
    }

    #[test]
    fn test_type_mismatch_rejected() {
        parse_fails(r#"
            policy Bad {
                require agent.role <= tx.amount
            }
        "#);
    }

    #[test]
    fn test_empty_policy_rejected() {
        parse_fails(r#"
            policy Empty {
            }
        "#);
    }

    // ---- constraint estimation ----

    #[test]
    fn test_constraint_estimation() {
        let p = parse_ok(r#"
            policy CostTest {
                require agent.role == "admin"
                require tx.amount <= 50000
                require tx.target IN org.whitelist
            }
        "#);
        let cost = estimate_constraints(&p);
        // equality: 1, comparison: 254, merkle: 5000
        assert_eq!(cost, 1 + 254 + 5000);
    }

    // ---- edge cases ----

    #[test]
    fn test_nested_boolean_logic() {
        parse_ok(r#"
            policy Complex {
                require (agent.role == "admin" or agent.role == "senior") and tx.amount <= 50000
            }
        "#);
    }

    #[test]
    fn test_deeply_nested_arithmetic() {
        parse_ok(r#"
            policy DeepMath {
                require (agent.daily_spent + tx.amount) * 2 <= agent.daily_limit
            }
        "#);
    }

    #[test]
    fn test_comments_ignored() {
        parse_ok(r#"
            // this is a comment
            policy Commented {
                // another comment
                require tx.amount <= 1000
            }
        "#);
    }

    #[test]
    fn test_consecutive_denial_counter() {
        parse_ok(r#"
            policy ThreeStrikes {
                require agent.consecutive_denials < 3
            }
        "#);
    }
}
