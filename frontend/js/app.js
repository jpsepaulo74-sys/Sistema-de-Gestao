const API_URL = 'http://localhost:3000/api';

// ==========================================
// NAVEGAÇÃO E UI
// ==========================================
function navigate(pageId) {
    document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('active'));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    const pageElement = document.getElementById('page-' + pageId);
    if (pageElement) {
        pageElement.classList.add('active');
    }

    const titles = {
        'dashboard': 'Dashboard',
        'vendas': 'Nova Venda',
        'historico': 'Histórico',
        'produtos': 'Produtos',
        'fornecedores': 'Fornecedores',
        'categorias': 'Categorias'
    };
    document.getElementById('pageTitle').innerText = titles[pageId];

    if (pageId === 'dashboard') carregarDashboard();
    if (pageId === 'produtos') { carregarCategoriasSelect(); carregarFornecedoresSelect('produtoFornecedor'); carregarProdutos(); }
    if (pageId === 'fornecedores') carregarFornecedores();
    if (pageId === 'categorias') carregarCategorias();
    if (pageId === 'historico') carregarHistorico();
    if (pageId === 'vendas') { buscarProdutoPDV(); }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function atualizarData() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').innerText = new Date().toLocaleDateString('pt-MZ', options);
}
atualizarData();

// ==========================================
// MODAIS
// ==========================================
function abrirModalProduto() {
    document.getElementById('produtoId').value = '';
    document.getElementById('produtoCodigo').value = '';
    document.getElementById('produtoNome').value = '';
    document.getElementById('produtoDescricao').value = '';
    document.getElementById('produtoPrecoCompra').value = '';
    document.getElementById('produtoPrecoVenda').value = '';
    document.getElementById('produtoEstoque').value = '';
    document.getElementById('produtoCategoria').value = '';
    document.getElementById('produtoFornecedor').value = '';
    document.getElementById('modalProdutoTitulo').innerText = 'Novo Produto';
    document.getElementById('modalProduto').classList.add('active');
}
function abrirModalFornecedor() {
    document.getElementById('fornecedorId').value = '';
    document.getElementById('fornecedorNome').value = '';
    document.getElementById('fornecedorEmail').value = '';
    document.getElementById('fornecedorTelefone').value = '';
    document.getElementById('fornecedorNuit').value = '';
    document.getElementById('fornecedorEndereco').value = '';
    document.getElementById('modalFornecedorTitulo').innerText = 'Novo Fornecedor';
    document.getElementById('modalFornecedor').classList.add('active');
}
function abrirModalCategoria() {
    document.getElementById('categoriaNome').value = '';
    document.getElementById('categoriaDescricao').value = '';
    document.getElementById('modalCategoria').classList.add('active');
}
function fecharModal(id) {
    document.getElementById(id).classList.remove('active');
}

// ==========================================
// API - DASHBOARD
// ==========================================
async function carregarDashboard() {
    try {
        const res = await fetch(`${API_URL}/dashboard`);
        if (!res.ok) return;
        const data = await res.json();
        
        document.getElementById('statVendas').innerText = data.totalVendas || 0;
        document.getElementById('statReceita').innerText = `${(data.receitaTotal || 0).toFixed(2).replace('.', ',')} MT`;
        document.getElementById('statProdutos').innerText = data.totalProdutos || 0;
        document.getElementById('statFornecedores').innerText = data.totalFornecedores || 0;

        const ultimasVendasBody = document.getElementById('dashUltimasVendas');
        ultimasVendasBody.innerHTML = '';
        data.ultimasVendas.forEach((venda, idx) => {
            ultimasVendasBody.innerHTML += `
                <tr>
                    <td>${idx + 1}</td>
                    <td>${venda.cliente_nome}</td>
                    <td>${venda.total.toFixed(2).replace('.', ',')} MT</td>
                    <td>${venda.forma_pagamento}</td>
                    <td><span class="badge badge-${venda.status === 'finalizada' ? 'success' : 'danger'}">${venda.status}</span></td>
                    <td>${new Date(venda.criado_em).toLocaleDateString('pt-MZ')}</td>
                </tr>
            `;
        });

        const topProdutosBody = document.getElementById('dashTopProdutos');
        topProdutosBody.innerHTML = '';
        data.topProdutos.forEach((p, idx) => {
            let badge = 'bronze';
            if(idx === 0) badge = 'gold';
            else if(idx === 1) badge = 'silver';
            
            topProdutosBody.innerHTML += `
                <div class="top-item">
                    <div class="rank ${badge}">${idx + 1}</div>
                    <div class="nome">${p.nome}</div>
                    <div class="qtd">${p.total_vendido} unid.</div>
                </div>
            `;
        });
    } catch (e) {
        console.error('Erro ao carregar dashboard', e);
    }
}

// ==========================================
// API - PRODUTOS
// ==========================================
async function carregarCategoriasSelect() {
    try {
        const res = await fetch(`${API_URL}/categorias`);
        const categorias = await res.json();
        let options = '<option value="">Selecione...</option>';
        let filterOptions = '<option value="">Todas Categorias</option>';
        categorias.forEach(c => {
            options += `<option value="${c.id}">${c.nome}</option>`;
            filterOptions += `<option value="${c.id}">${c.nome}</option>`;
        });
        document.getElementById('produtoCategoria').innerHTML = options;
        document.getElementById('filtroCatProduto').innerHTML = filterOptions;
    } catch (e) {
        console.error(e);
    }
}

async function carregarProdutos() {
    try {
        const busca = document.getElementById('buscaProduto').value;
        const cat = document.getElementById('filtroCatProduto').value;
        const res = await fetch(`${API_URL}/produtos?busca=${busca}&categoria_id=${cat}`);
        const produtos = await res.json();
        
        const tbody = document.getElementById('produtosTabela');
        tbody.innerHTML = '';
        produtos.forEach(p => {
            tbody.innerHTML += `
                <tr>
                    <td>${p.codigo || '-'}</td>
                    <td>${p.nome}</td>
                    <td>${p.categoria_nome}</td>
                    <td>${p.fornecedor_nome}</td>
                    <td>${(p.preco_compra || 0).toFixed(2).replace('.', ',')} MT</td>
                    <td>${(p.preco_venda || 0).toFixed(2).replace('.', ',')} MT</td>
                    <td>
                        <span class="badge badge-${p.estoque > 10 ? 'success' : (p.estoque > 0 ? 'warning' : 'danger')}">
                            ${p.estoque}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick='editarProduto(${JSON.stringify(p)})'><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="excluirProduto(${p.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        mostrarToast('Erro ao carregar produtos', 'error');
    }
}

async function salvarProduto() {
    const id = document.getElementById('produtoId').value;
    const data = {
        codigo: document.getElementById('produtoCodigo').value,
        nome: document.getElementById('produtoNome').value,
        descricao: document.getElementById('produtoDescricao').value,
        preco_compra: parseFloat(document.getElementById('produtoPrecoCompra').value),
        preco_venda: parseFloat(document.getElementById('produtoPrecoVenda').value),
        estoque: parseInt(document.getElementById('produtoEstoque').value),
        categoria_id: document.getElementById('produtoCategoria').value || null,
        fornecedor_id: document.getElementById('produtoFornecedor').value || null
    };

    if(!data.nome || isNaN(data.preco_compra) || isNaN(data.preco_venda)) {
        return mostrarToast('Nome e os preços são obrigatórios!', 'warning');
    }

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/produtos/${id}` : `${API_URL}/produtos`;
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        
        if (res.ok) {
            mostrarToast('Produto salvo com sucesso!', 'success');
            fecharModal('modalProduto');
            carregarProdutos();
        } else {
            mostrarToast(result.error || 'Erro ao salvar', 'error');
        }
    } catch (e) {
        mostrarToast('Erro de conexão', 'error');
    }
}

function editarProduto(p) {
    document.getElementById('produtoId').value = p.id;
    document.getElementById('produtoCodigo').value = p.codigo || '';
    document.getElementById('produtoNome').value = p.nome;
    document.getElementById('produtoDescricao').value = p.descricao || '';
    document.getElementById('produtoPrecoCompra').value = p.preco_compra;
    document.getElementById('produtoPrecoVenda').value = p.preco_venda;
    document.getElementById('produtoEstoque').value = p.estoque;
    document.getElementById('produtoCategoria').value = p.categoria_id || '';
    document.getElementById('produtoFornecedor').value = p.fornecedor_id || '';
    document.getElementById('modalProdutoTitulo').innerText = 'Editar Produto';
    document.getElementById('modalProduto').classList.add('active');
}

async function excluirProduto(id) {
    if(!confirm('Deseja realmente excluir este produto?')) return;
    try {
        const res = await fetch(`${API_URL}/produtos/${id}`, { method: 'DELETE' });
        if(res.ok) {
            mostrarToast('Produto removido', 'success');
            carregarProdutos();
        } else {
            const data = await res.json();
            mostrarToast(data.error || 'Erro ao remover', 'error');
        }
    } catch (e) {
        mostrarToast('Erro de conexão', 'error');
    }
}

// ==========================================
// API - FORNECEDORES
// ==========================================
async function carregarFornecedoresSelect(selectId) {
    try {
        const res = await fetch(`${API_URL}/fornecedores`);
        const fornecedores = await res.json();
        let options = '<option value="">Sem fornecedor</option>';
        fornecedores.forEach(f => {
            options += `<option value="${f.id}">${f.nome}</option>`;
        });
        if(document.getElementById(selectId)) {
            document.getElementById(selectId).innerHTML = options;
        }
    } catch (e) {
        console.error(e);
    }
}

async function carregarFornecedores() {
    try {
        const busca = document.getElementById('buscaFornecedor').value;
        const res = await fetch(`${API_URL}/fornecedores?busca=${busca}`);
        const fornecedores = await res.json();
        
        const tbody = document.getElementById('fornecedoresTabela');
        tbody.innerHTML = '';
        fornecedores.forEach(f => {
            tbody.innerHTML += `
                <tr>
                    <td>${f.nome}</td>
                    <td>${f.email || '-'}</td>
                    <td>${f.telefone || '-'}</td>
                    <td>${f.nuit || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-success" onclick="analisarProdutosFornecedor(${f.id}, '${f.nome}')" title="Ver produtos mais baratos"><i class="fas fa-search-dollar"></i></button>
                        <button class="btn btn-sm btn-info" onclick='editarFornecedor(${JSON.stringify(f)})'><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="excluirFornecedor(${f.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        mostrarToast('Erro ao carregar fornecedores', 'error');
    }
}

async function salvarFornecedor() {
    const id = document.getElementById('fornecedorId').value;
    const data = {
        nome: document.getElementById('fornecedorNome').value,
        email: document.getElementById('fornecedorEmail').value,
        telefone: document.getElementById('fornecedorTelefone').value,
        nuit: document.getElementById('fornecedorNuit').value,
        endereco: document.getElementById('fornecedorEndereco').value
    };

    if(!data.nome) {
        return mostrarToast('Nome é obrigatório!', 'warning');
    }

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/fornecedores/${id}` : `${API_URL}/fornecedores`;
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        
        if (res.ok) {
            mostrarToast('Fornecedor salvo com sucesso!', 'success');
            fecharModal('modalFornecedor');
            carregarFornecedores();
        } else {
            mostrarToast(result.error || 'Erro ao salvar', 'error');
        }
    } catch (e) {
        mostrarToast('Erro de conexão', 'error');
    }
}

function editarFornecedor(f) {
    document.getElementById('fornecedorId').value = f.id;
    document.getElementById('fornecedorNome').value = f.nome;
    document.getElementById('fornecedorEmail').value = f.email || '';
    document.getElementById('fornecedorTelefone').value = f.telefone || '';
    document.getElementById('fornecedorNuit').value = f.nuit || '';
    document.getElementById('fornecedorEndereco').value = f.endereco || '';
    document.getElementById('modalFornecedorTitulo').innerText = 'Editar Fornecedor';
    document.getElementById('modalFornecedor').classList.add('active');
}

async function excluirFornecedor(id) {
    if(!confirm('Deseja realmente excluir este fornecedor?')) return;
    try {
        const res = await fetch(`${API_URL}/fornecedores/${id}`, { method: 'DELETE' });
        if(res.ok) {
            mostrarToast('Fornecedor removido', 'success');
            carregarFornecedores();
        } else {
            const data = await res.json();
            mostrarToast(data.error || 'Erro ao remover', 'error');
        }
    } catch (e) {
        mostrarToast('Erro de conexão', 'error');
    }
}

// Análise de Produtos Mais Baratos do Fornecedor
async function analisarProdutosFornecedor(id, nomeFornecedor) {
    try {
        document.getElementById('modalFornecedorProdutosTitulo').innerText = `Análise de Preços: ${nomeFornecedor}`;
        document.getElementById('modalFornecedorProdutosConteudo').innerHTML = '<p>Carregando análise...</p>';
        document.getElementById('modalFornecedorProdutos').classList.add('active');

        const res = await fetch(`${API_URL}/fornecedores/${id}/produtos-baratos`);
        const produtos = await res.json();

        if (produtos.length === 0) {
            document.getElementById('modalFornecedorProdutosConteudo').innerHTML = '<p class="empty-message">Este fornecedor ainda não tem produtos associados.</p>';
            return;
        }

        let html = `
            <p style="margin-bottom: 15px; color: var(--text-light); font-size: 0.9rem;">
                Esta lista mostra todos os produtos fornecidos por esta empresa, organizados com base na <b>vantagem competitiva de preço de compra</b> em relação à média do sistema.
            </p>
            <table class="table">
                <thead>
                    <tr>
                        <th>Produto</th>
                        <th>Categoria</th>
                        <th>Preço Fornecedor</th>
                        <th>Média do Sistema</th>
                        <th>Vantagem</th>
                    </tr>
                </thead>
                <tbody>
        `;

        produtos.forEach(p => {
            const preco = (p.preco_compra || 0).toFixed(2).replace('.', ',');
            const media = (p.preco_medio_categoria || p.preco_compra || 0).toFixed(2).replace('.', ',');
            let destaque = '';
            let labelVantagem = '';

            if (p.diferenca_media > 0) {
                destaque = 'color: var(--success); font-weight: bold;';
                labelVantagem = `<span class="badge badge-success">${p.diferenca_media.toFixed(2).replace('.', ',')} MT mais barato</span>`;
            } else if (p.diferenca_media < 0) {
                destaque = 'color: var(--danger);';
                labelVantagem = `<span class="badge badge-danger">${Math.abs(p.diferenca_media).toFixed(2).replace('.', ',')} MT mais caro</span>`;
            } else {
                labelVantagem = '<span class="badge badge-warning">Na Média</span>';
            }

            html += `
                <tr>
                    <td>${p.nome}</td>
                    <td>${p.categoria_nome || '-'}</td>
                    <td style="${destaque}">${preco} MT</td>
                    <td>${media} MT</td>
                    <td>${labelVantagem}</td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        document.getElementById('modalFornecedorProdutosConteudo').innerHTML = html;
    } catch (e) {
        document.getElementById('modalFornecedorProdutosConteudo').innerHTML = '<p class="empty-message" style="color: var(--danger);">Erro ao carregar análise de preços.</p>';
    }
}


// ==========================================
// API - CATEGORIAS
// ==========================================
async function carregarCategorias() {
    try {
        const res = await fetch(`${API_URL}/categorias`);
        const categorias = await res.json();
        
        const tbody = document.getElementById('categoriasTabela');
        tbody.innerHTML = '';
        categorias.forEach((c, idx) => {
            tbody.innerHTML += `
                <tr>
                    <td>${idx + 1}</td>
                    <td>${c.nome}</td>
                    <td>${c.descricao || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="excluirCategoria(${c.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        mostrarToast('Erro ao carregar categorias', 'error');
    }
}

async function salvarCategoria() {
    const data = {
        nome: document.getElementById('categoriaNome').value,
        descricao: document.getElementById('categoriaDescricao').value
    };

    if(!data.nome) return mostrarToast('Nome é obrigatório!', 'warning');

    try {
        const res = await fetch(`${API_URL}/categorias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (res.ok) {
            mostrarToast('Categoria salva!', 'success');
            fecharModal('modalCategoria');
            carregarCategorias();
        } else {
            const result = await res.json();
            mostrarToast(result.error || 'Erro ao salvar', 'error');
        }
    } catch (e) {
        mostrarToast('Erro de conexão', 'error');
    }
}

async function excluirCategoria(id) {
    if(!confirm('Deseja excluir esta categoria?')) return;
    try {
        const res = await fetch(`${API_URL}/categorias/${id}`, { method: 'DELETE' });
        if(res.ok) {
            mostrarToast('Categoria removida', 'success');
            carregarCategorias();
        } else {
            mostrarToast('Erro ao remover', 'error');
        }
    } catch (e) {
        mostrarToast('Erro de conexão', 'error');
    }
}

// ==========================================
// PDV - PONTO DE VENDA E CARRINHO
// ==========================================
let carrinho = [];

async function buscarProdutoPDV() {
    try {
        const busca = document.getElementById('buscaProdutoPDV').value || '';
        const res = await fetch(`${API_URL}/produtos?busca=${busca}`);
        const produtos = await res.json();
        
        const grid = document.getElementById('produtosPDVGrid');
        grid.innerHTML = '';
        produtos.forEach(p => {
            grid.innerHTML += `
                <div class="produto-card-pdv" onclick='adicionarAoCarrinho(${JSON.stringify(p)})'>
                    <h4>${p.nome}</h4>
                    <div class="preco">${(p.preco_venda || 0).toFixed(2).replace('.', ',')} MT</div>
                    <div class="estoque ${p.estoque < 5 ? 'baixo' : ''}">Estoque: ${p.estoque}</div>
                </div>
            `;
        });
    } catch (e) {
        console.error(e);
    }
}

function adicionarAoCarrinho(produto) {
    if(produto.estoque <= 0) return mostrarToast('Produto sem estoque!', 'warning');
    
    const index = carrinho.findIndex(item => item.id === produto.id);
    if(index > -1) {
        if(carrinho[index].quantidade >= produto.estoque) {
            return mostrarToast('Estoque insuficiente!', 'warning');
        }
        carrinho[index].quantidade++;
    } else {
        carrinho.push({
            id: produto.id,
            nome: produto.nome,
            preco: produto.preco_venda || 0,
            quantidade: 1,
            estoque: produto.estoque
        });
    }
    renderizarCarrinho();
}

function alterarQuantidade(id, delta) {
    const index = carrinho.findIndex(item => item.id === id);
    if(index > -1) {
        const novaQtd = carrinho[index].quantidade + delta;
        if(novaQtd > carrinho[index].estoque) return mostrarToast('Estoque insuficiente!', 'warning');
        if(novaQtd <= 0) {
            carrinho.splice(index, 1);
        } else {
            carrinho[index].quantidade = novaQtd;
        }
        renderizarCarrinho();
    }
}

function limparCarrinho() {
    carrinho = [];
    document.getElementById('pdvDesconto').value = '0';
    renderizarCarrinho();
}

function renderizarCarrinho() {
    const container = document.getElementById('carrinhoItens');
    if(carrinho.length === 0) {
        container.innerHTML = '<p class="empty-message">Nenhum item no carrinho</p>';
        atualizarTotalCarrinho();
        return;
    }

    container.innerHTML = '';
    carrinho.forEach(item => {
        container.innerHTML += `
            <div class="carrinho-item">
                <div class="carrinho-item-info">
                    <h4>${item.nome}</h4>
                    <span>${item.preco.toFixed(2).replace('.', ',')} MT x ${item.quantidade}</span>
                </div>
                <div class="carrinho-item-qtd">
                    <button onclick="alterarQuantidade(${item.id}, -1)">-</button>
                    <span>${item.quantidade}</span>
                    <button onclick="alterarQuantidade(${item.id}, 1)">+</button>
                </div>
                <div class="carrinho-item-total">
                    ${(item.preco * item.quantidade).toFixed(2).replace('.', ',')} MT
                </div>
            </div>
        `;
    });
    atualizarTotalCarrinho();
}

function atualizarTotalCarrinho() {
    let subtotal = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
    let desconto = parseFloat(document.getElementById('pdvDesconto').value) || 0;
    
    if(desconto > subtotal) {
        desconto = subtotal;
        document.getElementById('pdvDesconto').value = desconto.toFixed(2);
    }
    
    let total = subtotal - desconto;
    
    document.getElementById('carrinhoSubtotal').innerText = `${subtotal.toFixed(2).replace('.', ',')} MT`;
    document.getElementById('carrinhoTotal').innerText = `${total.toFixed(2).replace('.', ',')} MT`;
}

async function finalizarVenda() {
    if(carrinho.length === 0) return mostrarToast('Carrinho vazio!', 'warning');
    
    const data = {
        desconto: parseFloat(document.getElementById('pdvDesconto').value) || 0,
        forma_pagamento: document.getElementById('pdvPagamento').value,
        itens: carrinho.map(item => ({
            produto_id: item.id,
            quantidade: item.quantidade
        }))
    };

    try {
        const res = await fetch(`${API_URL}/vendas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (res.ok) {
            mostrarToast('Venda finalizada com sucesso!', 'success');
            limparCarrinho();
            buscarProdutoPDV();
        } else {
            const result = await res.json();
            mostrarToast(result.error || 'Erro ao finalizar venda', 'error');
        }
    } catch (e) {
        mostrarToast('Erro de conexão', 'error');
    }
}

// ==========================================
// HISTÓRICO
// ==========================================
async function carregarHistorico() {
    try {
        const dataInicio = document.getElementById('filtroDataInicio').value;
        const dataFim = document.getElementById('filtroDataFim').value;
        const status = document.getElementById('filtroStatus').value;
        
        let url = `${API_URL}/vendas?`;
        if(dataInicio) url += `data_inicio=${dataInicio}&`;
        if(dataFim) url += `data_fim=${dataFim}&`;
        if(status) url += `status=${status}&`;
        
        const res = await fetch(url);
        const vendas = await res.json();
        
        const tbody = document.getElementById('historicoTabela');
        tbody.innerHTML = '';
        vendas.forEach(v => {
            tbody.innerHTML += `
                <tr>
                    <td>#${v.id}</td>
                    <td>${v.total.toFixed(2).replace('.', ',')} MT</td>
                    <td>${v.desconto.toFixed(2).replace('.', ',')} MT</td>
                    <td>${v.forma_pagamento}</td>
                    <td><span class="badge badge-${v.status === 'finalizada' ? 'success' : 'danger'}">${v.status}</span></td>
                    <td>${new Date(v.criado_em).toLocaleDateString('pt-MZ')}</td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="verDetalhesVenda(${v.id})" title="Ver Detalhes"><i class="fas fa-eye"></i></button>
                        ${v.status === 'finalizada' ? `<button class="btn btn-sm btn-warning" onclick="cancelarVenda(${v.id})" title="Cancelar Venda (Devolver Estoque)"><i class="fas fa-ban"></i></button>` : ''}
                        <button class="btn btn-sm btn-danger" onclick="excluirVendaHistorico(${v.id})" title="Apagar Registro Permanentemente"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        mostrarToast('Erro ao carregar histórico', 'error');
    }
}

async function verDetalhesVenda(id) {
    try {
        const res = await fetch(`${API_URL}/vendas/${id}`);
        const venda = await res.json();
        
        let html = `
            <div class="venda-detalhe-info">
                <div class="info-item">
                    <label>Venda #</label>
                    <p>${venda.id}</p>
                </div>
                <div class="info-item">
                    <label>Data</label>
                    <p>${new Date(venda.criado_em).toLocaleString('pt-MZ')}</p>
                </div>
                <div class="info-item">
                    <label>Pagamento</label>
                    <p>${venda.forma_pagamento}</p>
                </div>
                <div class="info-item">
                    <label>Status</label>
                    <p><span class="badge badge-${venda.status === 'finalizada' ? 'success' : 'danger'}">${venda.status}</span></p>
                </div>
                <div class="info-item">
                    <label>Total</label>
                    <p>${venda.total.toFixed(2).replace('.', ',')} MT</p>
                </div>
            </div>
            
            <h4>Itens da Venda</h4>
            <table class="table" style="margin-top: 10px;">
                <thead>
                    <tr>
                        <th>Produto</th>
                        <th>Qtd</th>
                        <th>Preço Unit.</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        venda.itens.forEach(item => {
            html += `
                <tr>
                    <td>${item.produto_nome} ${item.produto_codigo ? `(${item.produto_codigo})` : ''}</td>
                    <td>${item.quantidade}</td>
                    <td>${item.preco_unitario.toFixed(2).replace('.', ',')} MT</td>
                    <td>${item.subtotal.toFixed(2).replace('.', ',')} MT</td>
                </tr>
            `;
        });
        
        html += `</tbody></table>`;
        
        document.getElementById('detalheVendaConteudo').innerHTML = html;
        document.getElementById('modalDetalheVenda').classList.add('active');
    } catch (e) {
        mostrarToast('Erro ao carregar detalhes', 'error');
    }
}

async function cancelarVenda(id) {
    if(!confirm('Deseja realmente cancelar esta venda? O estoque dos produtos será devolvido.')) return;
    try {
        const res = await fetch(`${API_URL}/vendas/${id}/cancelar`, { method: 'PUT' });
        if(res.ok) {
            mostrarToast('Venda cancelada', 'success');
            carregarHistorico();
        } else {
            const data = await res.json();
            mostrarToast(data.error || 'Erro ao cancelar', 'error');
        }
    } catch (e) {
        mostrarToast('Erro de conexão', 'error');
    }
}

async function excluirVendaHistorico(id) {
    if(!confirm('CUIDADO: Deseja apagar permanentemente esta venda do sistema? (Se ela estava finalizada, o estoque será devolvido ao apagar)')) return;
    try {
        const res = await fetch(`${API_URL}/vendas/${id}`, { method: 'DELETE' });
        if(res.ok) {
            mostrarToast('Venda excluída definitivamente', 'success');
            carregarHistorico();
            carregarDashboard(); // Refresh dash numbers
        } else {
            const data = await res.json();
            mostrarToast(data.error || 'Erro ao excluir venda', 'error');
        }
    } catch (e) {
        mostrarToast('Erro de conexão', 'error');
    }
}

// ==========================================
// TOASTS
// ==========================================
function mostrarToast(mensagem, tipo = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    
    let icon = 'info-circle';
    if(tipo === 'success') icon = 'check-circle';
    if(tipo === 'error') icon = 'exclamation-circle';
    if(tipo === 'warning') icon = 'exclamation-triangle';

    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <div class="toast-message">${mensagem}</div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Inicializa a primeira página
carregarDashboard();