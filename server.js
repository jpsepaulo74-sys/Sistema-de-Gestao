const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// =============================================
// ROTAS - DASHBOARD
// =============================================
app.get('/api/dashboard', (req, res) => {
    try {
        const totalVendas = db.prepare('SELECT COUNT(*) as total FROM vendas').get();
        const receitaTotal = db.prepare('SELECT COALESCE(SUM(total - desconto), 0) as receita FROM vendas WHERE status = ?').get('finalizada');
        const totalProdutos = db.prepare('SELECT COUNT(*) as total FROM produtos').get();
        const totalFornecedores = db.prepare('SELECT COUNT(*) as total FROM fornecedores').get();
        const produtosEstoqueBaixo = db.prepare('SELECT COUNT(*) as total FROM produtos WHERE estoque <= 10').get();

        const vendasRecentes = db.prepare(`
            SELECT DATE(criado_em) as data, COUNT(*) as quantidade, SUM(total - desconto) as receita
            FROM vendas WHERE criado_em >= DATE('now', '-7 days') AND status = 'finalizada'
            GROUP BY DATE(criado_em) ORDER BY data
        `).all();

        const topProdutos = db.prepare(`
            SELECT COALESCE(p.nome, iv.produto_nome_historico) as nome, SUM(iv.quantidade) as total_vendido
            FROM itens_venda iv
            LEFT JOIN produtos p ON p.id = iv.produto_id
            JOIN vendas v ON v.id = iv.venda_id
            WHERE v.status = 'finalizada'
            GROUP BY iv.produto_id, iv.produto_nome_historico
            ORDER BY total_vendido DESC LIMIT 5
        `).all();

        const ultimasVendas = db.prepare(`
            SELECT v.*, 'Cliente avulso' as cliente_nome
            FROM vendas v
            ORDER BY v.criado_em DESC LIMIT 5
        `).all();

        res.json({
            totalVendas: totalVendas.total,
            receitaTotal: receitaTotal.receita,
            totalProdutos: totalProdutos.total,
            totalFornecedores: totalFornecedores.total,
            produtosEstoqueBaixo: produtosEstoqueBaixo.total,
            vendasRecentes,
            topProdutos,
            ultimasVendas
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =============================================
// ROTAS - PRODUTOS
// =============================================
app.get('/api/produtos', (req, res) => {
    try {
        const { busca, categoria_id } = req.query;
        let sql = `
            SELECT p.*, COALESCE(c.nome, 'Sem categoria') as categoria_nome, COALESCE(f.nome, 'Sem fornecedor') as fornecedor_nome
            FROM produtos p
            LEFT JOIN categorias c ON c.id = p.categoria_id
            LEFT JOIN fornecedores f ON f.id = p.fornecedor_id
            WHERE 1=1
        `;
        const params = [];

        if (busca) {
            sql += ' AND (p.nome LIKE ? OR p.codigo LIKE ?)';
            params.push(`%${busca}%`, `%${busca}%`);
        }
        if (categoria_id) {
            sql += ' AND p.categoria_id = ?';
            params.push(categoria_id);
        }

        sql += ' ORDER BY p.nome';
        const produtos = db.prepare(sql).all(...params);
        res.json(produtos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/produtos/:id', (req, res) => {
    try {
        const produto = db.prepare(`
            SELECT p.*, COALESCE(c.nome, 'Sem categoria') as categoria_nome, COALESCE(f.nome, 'Sem fornecedor') as fornecedor_nome
            FROM produtos p
            LEFT JOIN categorias c ON c.id = p.categoria_id
            LEFT JOIN fornecedores f ON f.id = p.fornecedor_id
            WHERE p.id = ?
        `).get(req.params.id);

        if (!produto) return res.status(404).json({ error: 'Produto não encontrado' });
        res.json(produto);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/produtos', (req, res) => {
    try {
        const { nome, descricao, preco_compra, preco_venda, estoque, categoria_id, fornecedor_id, codigo } = req.body;
        if (!nome || preco_venda === undefined || preco_compra === undefined) {
            return res.status(400).json({ error: 'Nome, preço de compra e preço de venda são obrigatórios' });
        }

        const result = db.prepare(
            'INSERT INTO produtos (nome, descricao, preco_compra, preco_venda, estoque, categoria_id, fornecedor_id, codigo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(nome, descricao || '', preco_compra, preco_venda, estoque || 0, categoria_id || null, fornecedor_id || null, codigo || null);

        const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(produto);
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Código do produto já existe' });
        }
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/produtos/:id', (req, res) => {
    try {
        const { nome, descricao, preco_compra, preco_venda, estoque, categoria_id, fornecedor_id, codigo } = req.body;
        db.prepare(
            'UPDATE produtos SET nome=?, descricao=?, preco_compra=?, preco_venda=?, estoque=?, categoria_id=?, fornecedor_id=?, codigo=? WHERE id=?'
        ).run(nome, descricao, preco_compra, preco_venda, estoque, categoria_id || null, fornecedor_id || null, codigo, req.params.id);

        const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
        res.json(produto);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/produtos/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM produtos WHERE id = ?').run(req.params.id);
        res.json({ message: 'Produto removido com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =============================================
// ROTAS - FORNECEDORES
// =============================================
app.get('/api/fornecedores', (req, res) => {
    try {
        const { busca } = req.query;
        let sql = 'SELECT * FROM fornecedores WHERE 1=1';
        const params = [];

        if (busca) {
            sql += ' AND (nome LIKE ? OR nuit LIKE ? OR email LIKE ?)';
            params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
        }

        sql += ' ORDER BY nome';
        const fornecedores = db.prepare(sql).all(...params);
        res.json(fornecedores);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/fornecedores/:id', (req, res) => {
    try {
        const fornecedor = db.prepare('SELECT * FROM fornecedores WHERE id = ?').get(req.params.id);
        if (!fornecedor) return res.status(404).json({ error: 'Fornecedor não encontrado' });
        res.json(fornecedor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Buscar produtos mais baratos do fornecedor (comparado à média da categoria pelo preco_compra)
app.get('/api/fornecedores/:id/produtos-baratos', (req, res) => {
    try {
        const fornecedorId = req.params.id;
        
        const sql = `
            SELECT p.*, c.nome as categoria_nome, 
                   (SELECT AVG(p2.preco_compra) FROM produtos p2 WHERE p2.categoria_id = p.categoria_id) as preco_medio_categoria
            FROM produtos p
            LEFT JOIN categorias c ON c.id = p.categoria_id
            WHERE p.fornecedor_id = ?
        `;
        const produtos = db.prepare(sql).all(fornecedorId);
        
        const analise = produtos.map(p => {
            const avg = p.preco_medio_categoria || p.preco_compra;
            const diff = avg - p.preco_compra; 
            const isBarato = p.preco_compra <= avg;
            return {
                ...p,
                diferenca_media: diff,
                is_barato: isBarato
            };
        }).sort((a, b) => b.diferenca_media - a.diferenca_media); 

        res.json(analise);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/fornecedores', (req, res) => {
    try {
        const { nome, email, telefone, endereco, nuit } = req.body;
        if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

        const result = db.prepare(
            'INSERT INTO fornecedores (nome, email, telefone, endereco, nuit) VALUES (?, ?, ?, ?, ?)'
        ).run(nome, email || '', telefone || '', endereco || '', nuit || null);

        const fornecedor = db.prepare('SELECT * FROM fornecedores WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(fornecedor);
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'NUIT já cadastrado' });
        }
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/fornecedores/:id', (req, res) => {
    try {
        const { nome, email, telefone, endereco, nuit } = req.body;
        db.prepare(
            'UPDATE fornecedores SET nome=?, email=?, telefone=?, endereco=?, nuit=? WHERE id=?'
        ).run(nome, email, telefone, endereco, nuit, req.params.id);

        const fornecedor = db.prepare('SELECT * FROM fornecedores WHERE id = ?').get(req.params.id);
        res.json(fornecedor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/fornecedores/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM fornecedores WHERE id = ?').run(req.params.id);
        res.json({ message: 'Fornecedor removido com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =============================================
// ROTAS - CATEGORIAS
// =============================================
app.get('/api/categorias', (req, res) => {
    try {
        const categorias = db.prepare('SELECT * FROM categorias ORDER BY nome').all();
        res.json(categorias);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/categorias', (req, res) => {
    try {
        const { nome, descricao } = req.body;
        if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

        const result = db.prepare('INSERT INTO categorias (nome, descricao) VALUES (?, ?)').run(nome, descricao || '');
        const categoria = db.prepare('SELECT * FROM categorias WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(categoria);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/categorias/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM categorias WHERE id = ?').run(req.params.id);
        res.json({ message: 'Categoria removida' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =============================================
// ROTAS - VENDAS
// =============================================
app.get('/api/vendas', (req, res) => {
    try {
        const { data_inicio, data_fim, status } = req.query;
        let sql = `
            SELECT v.*, 'Cliente avulso' as cliente_nome
            FROM vendas v
            WHERE 1=1
        `;
        const params = [];

        if (data_inicio) {
            sql += ' AND DATE(v.criado_em) >= ?';
            params.push(data_inicio);
        }
        if (data_fim) {
            sql += ' AND DATE(v.criado_em) <= ?';
            params.push(data_fim);
        }
        if (status) {
            sql += ' AND v.status = ?';
            params.push(status);
        }

        sql += ' ORDER BY v.criado_em DESC';
        const vendas = db.prepare(sql).all(...params);
        res.json(vendas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/vendas/:id', (req, res) => {
    try {
        const venda = db.prepare(`
            SELECT v.*, 'Cliente avulso' as cliente_nome
            FROM vendas v
            WHERE v.id = ?
        `).get(req.params.id);

        if (!venda) return res.status(404).json({ error: 'Venda não encontrada' });

        const itens = db.prepare(`
            SELECT iv.*, COALESCE(p.nome, iv.produto_nome_historico) as produto_nome, p.codigo as produto_codigo
            FROM itens_venda iv
            LEFT JOIN produtos p ON p.id = iv.produto_id
            WHERE iv.venda_id = ?
        `).all(req.params.id);

        venda.itens = itens;
        res.json(venda);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/vendas', (req, res) => {
    try {
        const { itens, desconto, forma_pagamento, observacao } = req.body;

        if (!itens || itens.length === 0) {
            return res.status(400).json({ error: 'A venda deve ter pelo menos um item' });
        }

        let total = 0;
        const processedItens = [];
        
        for (const item of itens) {
            const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(item.produto_id);
            if (!produto) {
                return res.status(400).json({ error: `Produto ID ${item.produto_id} não encontrado` });
            }
            if (produto.estoque < item.quantidade) {
                return res.status(400).json({ error: `Estoque insuficiente para "${produto.nome}". Disponível: ${produto.estoque}` });
            }
            item.preco_unitario = produto.preco_venda;
            item.subtotal = produto.preco_venda * item.quantidade;
            item.nome = produto.nome; // Salvamos o nome para gravar no histórico
            total += item.subtotal;
            processedItens.push(item);
        }

        const resultVenda = db.prepare(
            'INSERT INTO vendas (total, desconto, forma_pagamento, status, observacao) VALUES (?, ?, ?, ?, ?)'
        ).run(
            total,
            desconto || 0,
            forma_pagamento || 'dinheiro',
            'finalizada',
            observacao || ''
        );

        const vendaId = resultVenda.lastInsertRowid;

        const insertItem = db.prepare(
            'INSERT INTO itens_venda (venda_id, produto_id, produto_nome_historico, quantidade, preco_unitario, subtotal) VALUES (?, ?, ?, ?, ?, ?)'
        );
        const updateEstoque = db.prepare('UPDATE produtos SET estoque = estoque - ? WHERE id = ?');

        for (const item of processedItens) {
            insertItem.run(vendaId, item.produto_id, item.nome, item.quantidade, item.preco_unitario, item.subtotal);
            updateEstoque.run(item.quantidade, item.produto_id);
        }

        const venda = db.prepare(`SELECT v.*, 'Cliente avulso' as cliente_nome FROM vendas v WHERE v.id = ?`).get(vendaId);
        venda.itens = db.prepare(`
            SELECT iv.*, COALESCE(p.nome, iv.produto_nome_historico) as produto_nome
            FROM itens_venda iv LEFT JOIN produtos p ON p.id = iv.produto_id
            WHERE iv.venda_id = ?
        `).all(vendaId);

        res.status(201).json(venda);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/vendas/:id/cancelar', (req, res) => {
    try {
        const venda = db.prepare('SELECT * FROM vendas WHERE id = ?').get(req.params.id);
        if (!venda) return res.status(404).json({ error: 'Venda não encontrada' });
        if (venda.status === 'cancelada') return res.status(400).json({ error: 'Venda já está cancelada' });

        const itens = db.prepare('SELECT * FROM itens_venda WHERE venda_id = ?').all(req.params.id);
        const updateEstoque = db.prepare('UPDATE produtos SET estoque = estoque + ? WHERE id = ?');
        for (const item of itens) {
            if(item.produto_id) { // Only update stock if product wasn't deleted
                updateEstoque.run(item.quantidade, item.produto_id);
            }
        }

        db.prepare('UPDATE vendas SET status = ? WHERE id = ?').run('cancelada', req.params.id);
        res.json({ message: 'Venda cancelada com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/vendas/:id', (req, res) => {
    try {
        const venda = db.prepare('SELECT * FROM vendas WHERE id = ?').get(req.params.id);
        if (!venda) return res.status(404).json({ error: 'Venda não encontrada' });

        if (venda.status === 'finalizada') {
            const itens = db.prepare('SELECT * FROM itens_venda WHERE venda_id = ?').all(req.params.id);
            const updateEstoque = db.prepare('UPDATE produtos SET estoque = estoque + ? WHERE id = ?');
            for (const item of itens) {
                if(item.produto_id) {
                    updateEstoque.run(item.quantidade, item.produto_id);
                }
            }
        }

        db.prepare('DELETE FROM itens_venda WHERE venda_id = ?').run(req.params.id);
        db.prepare('DELETE FROM vendas WHERE id = ?').run(req.params.id);
        res.json({ message: 'Venda removida com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════════╗
  ║   🛒 Sistema de Gestão de Vendas        ║
  ║   Servidor rodando na porta ${PORT}         ║
  ║   http://localhost:${PORT}                  ║
  ╚══════════════════════════════════════════╝
  `);
});