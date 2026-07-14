const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'vendas.db'));

// Ativar WAL mode para melhor performance
db.pragma('journal_mode = WAL');

// =============================================
// CRIAR TABELAS
// =============================================
db.exec(`
  CREATE TABLE IF NOT EXISTS fornecedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    endereco TEXT,
    nuit TEXT UNIQUE,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT
  );

  CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descricao TEXT,
    preco_compra REAL NOT NULL DEFAULT 0,
    preco_venda REAL NOT NULL DEFAULT 0,
    estoque INTEGER NOT NULL DEFAULT 0,
    categoria_id INTEGER,
    fornecedor_id INTEGER,
    codigo TEXT UNIQUE,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS vendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total REAL NOT NULL DEFAULT 0,
    desconto REAL DEFAULT 0,
    forma_pagamento TEXT DEFAULT 'dinheiro',
    status TEXT DEFAULT 'finalizada',
    observacao TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS itens_venda (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venda_id INTEGER NOT NULL,
    produto_id INTEGER,
    produto_nome_historico TEXT NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 1,
    preco_unitario REAL NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE SET NULL
  );
`);

// =============================================
// Inserir dados iniciais (se tabelas vazias)
// =============================================
const countCategorias = db.prepare('SELECT COUNT(*) as total FROM categorias').get();
if (countCategorias.total === 0) {
  const insertCat = db.prepare('INSERT INTO categorias (nome, descricao) VALUES (?, ?)');
  insertCat.run('Eletrônicos', 'Produtos eletrônicos em geral');
  insertCat.run('Roupas', 'Vestuário masculino e feminino');
  insertCat.run('Alimentos', 'Produtos alimentícios');
  insertCat.run('Bebidas', 'Bebidas em geral');
  insertCat.run('Outros', 'Produtos diversos');
}

const countFornecedores = db.prepare('SELECT COUNT(*) as total FROM fornecedores').get();
if (countFornecedores.total === 0) {
  const insertForn = db.prepare('INSERT INTO fornecedores (nome, email, telefone, endereco, nuit) VALUES (?, ?, ?, ?, ?)');
  insertForn.run('Maputo Tech', 'contato@maputotech.co.mz', '84 111 1111', 'Av. 24 de Julho, Maputo', '400111111');
  insertForn.run('Modas Moçambique', 'vendas@modasmz.co.mz', '82 222 2222', 'Av. Eduardo Mondlane, Maputo', '400222222');
  insertForn.run('Alimentos Zimpeto', 'comercial@zimpeto.co.mz', '84 333 3333', 'Mercado do Zimpeto, Maputo', '400333333');
}

const countProdutos = db.prepare('SELECT COUNT(*) as total FROM produtos').get();
if (countProdutos.total === 0) {
  const insertProd = db.prepare('INSERT INTO produtos (nome, descricao, preco_compra, preco_venda, estoque, categoria_id, fornecedor_id, codigo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  insertProd.run('Smartphone Samsung', 'Galaxy A54 128GB', 14000.00, 18999.99, 25, 1, 1, 'PROD001');
  insertProd.run('Notebook Dell', 'Inspiron 15 i5 8GB', 28000.00, 34999.90, 10, 1, 1, 'PROD002');
  insertProd.run('Camiseta Básica', 'Camiseta algodão M', 250.00, 499.90, 100, 2, 2, 'PROD003');
  insertProd.run('Calça Jeans', 'Calça jeans slim 42', 700.00, 1299.90, 50, 2, 2, 'PROD004');
  insertProd.run('Arroz 25kg', 'Arroz branco tipo 1', 950.00, 1250.00, 200, 3, 3, 'PROD005');
  insertProd.run('Refrigerante 2L', 'Coca-Cola 2 litros', 60.00, 90.00, 150, 4, 3, 'PROD006');
}

module.exports = db;