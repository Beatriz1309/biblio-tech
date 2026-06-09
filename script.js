// =========================================================================
// 1. GERENCIAMENTO DE ESTADO & DADOS FICTÍCIOS
// =========================================================================
const pessoasFicticias = [
    { id: 101, nome: "Ana Silva Oliveira", cpf: "12345678901", email: "ana.silva@email.com" },
    { id: 102, nome: "Bruno Medeiros Costa", cpf: "98765432100", email: "bruno.costa@email.com" },
    { id: 103, nome: "Carlos Eduardo Souza", cpf: "45678912311", email: "cadu.souza@email.com" },
    { id: 104, nome: "Mariana Rocha Lima", cpf: "78912345622", email: "mari.rocha@email.com" }
];

// Instancia a conta mestre do administrador para validação estrita de sessão
const contaAdminGlobal = { id: "admin", nome: "Administrador (Controle)", email: "admin@bibliotech.com" };

let clientes = JSON.parse(localStorage.getItem('clientes'));
if (!clientes || clientes.length === 0) {
    clientes = pessoasFicticias;
    localStorage.setItem('clientes', JSON.stringify(clientes));
}

let emprestimos = JSON.parse(localStorage.getItem('emprestimos')) || [];
let livroSelecionado = null;

// =========================================================================
// 2. EXECUTOR POR PÁGINA (Roteador Dinâmico)
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("selecao-perfil-inicial")) {
        inicializarPaginaLogin();
    } else if (document.getElementById("form-cadastro")) {
        inicializarPaginaCadastro();
    } else if (document.getElementById("input-busca") || document.getElementById("painel-admin")) {
        inicializarPaginaPainel();
    }
});

// =========================================================================
// 3. LÓGICA DA PÁGINA: LOGIN (index.html)
// =========================================================================
function inicializarPaginaLogin() {
    const divEscolha = document.getElementById('selecao-perfil-inicial');
    const formUser = document.getElementById('form-login');
    const formAdmin = document.getElementById('form-login-admin');
    
    const btnEscolhaUser = document.getElementById('btn-escolha-usuario');
    const btnEscolhaAdmin = document.getElementById('btn-escolha-admin');
    const btnsVoltar = document.querySelectorAll('.btn-voltar-perfil');
    
    const selectLogin = document.getElementById('select-login');

    // Alimenta o Select apenas com os usuários comuns
    selectLogin.innerHTML = '<option value="">-- Escolha seu perfil de acesso --</option>';
    clientes.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.nome} (${c.email})`;
        selectLogin.appendChild(opt);
    });

    // Eventos de Troca Visual dos Cards de Opção de Perfil
    btnEscolhaUser.addEventListener('click', () => {
        divEscolha.classList.add('hidden');
        formUser.classList.remove('hidden');
    });

    btnEscolhaAdmin.addEventListener('click', () => {
        divEscolha.classList.add('hidden');
        formAdmin.classList.remove('hidden');
    });

    btnsVoltar.forEach(btn => {
        btn.addEventListener('click', () => {
            formUser.classList.add('hidden');
            formAdmin.classList.add('hidden');
            divEscolha.classList.remove('hidden');
        });
    });

    // Submit do Usuário Comum
    formUser.addEventListener('submit', (e) => {
        e.preventDefault();
        const idSelecionado = selectLogin.value;
        const usuarioLogado = clientes.find(c => c.id == idSelecionado);

        if (usuarioLogado) {
            localStorage.setItem('usuarioSessao', JSON.stringify(usuarioLogado));
            window.location.href = "painel.html";
        }
    });

    // Submit do Administrador
    formAdmin.addEventListener('submit', (e) => {
        e.preventDefault();
        localStorage.setItem('usuarioSessao', JSON.stringify(contaAdminGlobal));
        window.location.href = "painel.html";
    });
}

// =========================================================================
// 4. LÓGICA DA PÁGINA: CADASTRO (cadastro.html)
// =========================================================================
function inicializarPaginaCadastro() {
    const formCadastro = document.getElementById('form-cadastro');

    formCadastro.addEventListener('submit', (e) => {
        e.preventDefault();
        const nome = document.getElementById('cad-nome').value.trim();
        const cpf = document.getElementById('cad-cpf').value.trim();
        const email = document.getElementById('cad-email').value.trim();

        if (!nome || !cpf || !email) {
            alert("Tratamento de erro: Por favor, preencha todos os campos.");
            return;
        }

        const novoCliente = { id: Date.now(), nome, cpf, email };
        clientes.push(novoCliente);
        localStorage.setItem('clientes', JSON.stringify(clientes));

        alert(`Sucesso! ${nome} foi cadastrado.`);
        window.location.href = "index.html";
    });
}

// =========================================================================
// 5. LÓGICA DA PÁGINA: PAINEL (painel.html)
// =========================================================================
function inicializarPaginaPainel() {
    const usuarioSessao = JSON.parse(localStorage.getItem('usuarioSessao'));
    if (!usuarioSessao) {
        alert("Acesso negado. Por favor, realize o login primeiro.");
        window.location.href = "index.html";
        return;
    }

    const seccionUser = document.getElementById('visao-usuario');
    const seccionAdmin = document.getElementById('painel-admin');
    const btnLogout = document.getElementById('btn-logout');
    
    document.getElementById('usuario-logado-nome').textContent = usuarioSessao.nome;

    // --- CONTROLE DE VISÃO RESTREITO (ADMIN vs USUÁRIO COMUM) ---
    if (usuarioSessao.id === 'admin') {
        if (seccionUser) seccionUser.classList.add('hidden');
        if (seccionAdmin) seccionAdmin.classList.remove('hidden');
        renderizarCardsAdmin(); 
        renderizarGerenciamentoUsuarios(); // EXTRAS: Renderiza a lista de controle de leitores cadastrados
    } else {
        if (seccionAdmin) seccionAdmin.classList.add('hidden');
        if (seccionUser) seccionUser.classList.remove('hidden');

        document.getElementById('checkout-cliente-nome').textContent = usuarioSessao.nome;
        const inputBusca = document.getElementById('input-busca');
        const btnBuscar = document.getElementById('btn-buscar');
        const loading = document.getElementById('loading');
        const resultadoBusca = document.getElementById('resultado-busca');
        const btnFinalizar = document.getElementById('btn-finalizar-emprestimo');
        const livroStatus = document.getElementById('livro-selecionado-status'); // Ajustado para a grafia correta

        renderizarEmprestimosAtivos();

        // Requisição na API de Busca
        btnBuscar.addEventListener('click', async () => {
            const termo = inputBusca.value.trim();
            if (!termo) return alert("Por favor digite um termo de busca.");

            loading.classList.remove('hidden');
            resultadoBusca.innerHTML = '';

            try {
                const response = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(termo)}`);
                if (!response.ok) throw new Error("A conexão com a API falhou.");
                
                const data = await response.json();
                if (!data.docs || data.docs.length === 0) {
                    resultadoBusca.innerHTML = `<p style="color:var(--danger); font-weight:bold;">Nenhum livro localizado para "${termo}".</p>`;
                    return;
                }

                const filtrados = data.docs.slice(0, 5);
                filtrados.forEach(livro => {
                    const titulo = livro.title;
                    const autor = livro.author_name ? livro.author_name[0] : "Autor Desconhecido";
                    const capaId = livro.cover_i;
                    const capaUrl = capaId ? `https://covers.openlibrary.org/b/id/${capaId}-M.jpg` : 'https://via.placeholder.com/100x140?text=Sem+Capa';

                    const card = document.createElement('div');
                    card.className = 'mini-card-busca';
                    card.innerHTML = `
                        <img src="${capaUrl}" alt="Capa" width="55">
                        <div class="mini-card-info">
                            <h4>${titulo}</h4>
                            <p>Autor: ${autor}</p>
                            <button class="btn-sm-primary" onclick="vincularLivroCheckout('${titulo.replace(/'/g, "\\'")}', '${capaUrl}')">Selecionar</button>
                        </div>
                    `;
                    resultadoBusca.appendChild(card);
                });
            } catch (erro) {
                resultadoBusca.innerHTML = `<p style="color:var(--danger);">Ocorreu um erro: ${erro.message}</p>`;
            } finally {
                loading.classList.add('hidden');
            }
        });

        // GRAFIA CORRIGIDA: Vincula o livro selecionado perfeitamente na interface
        window.vincularLivroCheckout = function(titulo, capa) {
            livroSelecionado = { titulo, capa };
            livroStatus.className = "status-preenchido";
            livroStatus.innerHTML = `
                <div class="checkout-preview">
                    <img src="${capa}" width="45">
                    <p><strong>Selecionado:</strong><br>${titulo}</p>
                </div>
            `;
            btnFinalizar.disabled = false;
        };

        btnFinalizar.addEventListener('click', () => {
            if (!livroSelecionado) return;

            const dataVencimento = new Date();
            dataVencimento.setDate(dataVencimento.getDate() + 10);

            const novoEmprestimo = {
                id: Date.now(),
                leitor: usuarioSessao.nome,
                livro: livroSelecionado.titulo,
                capa: livroSelecionado.capa,
                vencimento: dataVencimento.toLocaleDateString('pt-BR')
            };

            emprestimos.push(novoEmprestimo);
            localStorage.setItem('emprestimos', JSON.stringify(emprestimos));

            alert(`Empréstimo registrado! Devolução em: ${novoEmprestimo.vencimento}`);
            
            livroSelecionado = null;
            livroStatus.className = "status-vazio";
            livroStatus.innerHTML = `<p>Nenhum livro selecionado para esta conta ainda.</p>`;
            btnFinalizar.disabled = true;
            resultadoBusca.innerHTML = '';
            inputBusca.value = '';

            renderizarEmprestimosAtivos();
        });
    }

    btnLogout.addEventListener('click', () => {
        localStorage.removeItem('usuarioSessao');
        window.location.href = "index.html";
    });
}

// Renderiza a lista do usuário comum logado
function renderizarEmprestimosAtivos() {
    const gridEmprestimos = document.getElementById('grid-emprestimos');
    if (!gridEmprestimos) return;
    gridEmprestimos.innerHTML = '';

    const usuarioSessao = JSON.parse(localStorage.getItem('usuarioSessao'));
    const meusEmprestimos = emprestimos.filter(e => e.leitor === usuarioSessao.nome);

    if (meusEmprestimos.length === 0) {
        gridEmprestimos.innerHTML = `<p style="grid-column: 1/-1; color: #64748b; text-align:center;">Você não possui empréstimos ativos no momento.</p>`;
        return;
    }

    meusEmprestimos.forEach(emp => {
        const card = document.createElement('div');
        card.className = 'card-ativo';
        card.innerHTML = `
            <img src="${emp.capa}" alt="Capa">
            <div class="card-ativo-corpo">
                <h4>${emp.livro}</h4>
                <p>Leitor: <strong>${emp.leitor}</strong></p>
                <p>Devolução: <span class="data-alerta">${emp.vencimento}</span></p>
            </div>
        `;
        gridEmprestimos.appendChild(card);
    });
}

// --- FASE C: CONTROLE EXCLUSIVO DO ADMIN (Lê o LocalStorage diretamente) ---
function renderizarCardsAdmin() {
    const gridAdmin = document.getElementById('grid-admin-cards');
    if (!gridAdmin) return;
    gridAdmin.innerHTML = '';

    if (emprestimos.length === 0) {
        gridAdmin.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:#64748b; padding: 20px;">Nenhum livro em circulação no sistema local.</p>`;
        return;
    }

    emprestimos.forEach(emp => {
        const card = document.createElement('div');
        card.className = 'card-ativo'; 
        card.innerHTML = `
            <img src="${emp.capa}" alt="Capa do Livro">
            <div class="card-ativo-corpo">
                <h4 style="color: var(--primary); font-size:1.05rem;">${emp.livro}</h4>
                <p style="margin: 6px 0 3px 0;">👤 <strong>Quem pegou:</strong> ${emp.leitor}</p>
                <p style="margin: 3px 0;">📅 <strong>Devolução:</strong> <span class="data-alerta">${emp.vencimento}</span></p>
                <button class="btn-danger-sm" style="margin-top: 10px; width:100%; border-radius:4px;" onclick="darBaixaAdmin(${emp.id})">Dar Baixa / Devolver</button>
            </div>
        `;
        gridAdmin.appendChild(card);
    });
}

// O Administrador remove o registro do banco local ao dar baixa
window.darBaixaAdmin = function(id) {
    if (confirm("Deseja confirmar o retorno físico deste livro e dar baixa no sistema?")) {
        emprestimos = emprestimos.filter(e => e.id !== id);
        localStorage.setItem('emprestimos', JSON.stringify(emprestimos));
        renderizarCardsAdmin(); 
    }
};

// --- NOVO EXTRAS: GERENCIAMENTO E CONTROLE DE CADASTROS DO ADMIN ---
function renderizarGerenciamentoUsuarios() {
    const painelAdminContainer = document.getElementById('painel-admin');
    if (!painelAdminContainer) return;

    // Se a seção de usuários ainda não existir na tela, nós a criamos de forma limpa abaixo do grid de livros
    let seccionUsuarios = document.getElementById('seccion-admin-usuarios');
    if (!seccionUsuarios) {
        seccionUsuarios = document.createElement('section');
        seccionUsuarios.id = 'seccion-admin-usuarios';
        seccionUsuarios.className = 'panel';
        seccionUsuarios.style.marginTop = '25px';
        seccionUsuarios.style.borderTop = '5px solid var(--success)';
        seccionUsuarios.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h2 style="margin: 0; color: var(--dark);">👥 Controle de Leitores Cadastrados</h2>
                <p style="margin: 5px 0 0 0; color: #64748b;">Visualize e gerencie as credenciais registradas no banco local.</p>
            </div>
            <hr style="opacity: 0.3;">
            <div id="grid-admin-usuarios" class="grid-cards" style="margin-top: 20px;"></div>
        `;
        painelAdminContainer.appendChild(seccionUsuarios);
    }

    const gridUsuarios = document.getElementById('grid-admin-usuarios');
    gridUsuarios.innerHTML = '';

    if (clientes.length === 0) {
        gridUsuarios.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:#64748b;">Nenhum usuário cadastrado.</p>`;
        return;
    }

    // Cria cards para gerenciar e controlar os moradores integrados
    clientes.forEach(cli => {
        const cardCli = document.createElement('div');
        cardCli.className = 'card-ativo';
        cardCli.style.backgroundColor = '#f8fafc';
        cardCli.innerHTML = `
            <div style="font-size: 2rem; display: flex; align-items: center; justify-content: center; padding: 10px; background: #e2e8f0; border-radius: 6px; height: fit-content;">👤</div>
            <div class="card-ativo-corpo" style="width: 100%;">
                <h4 style="margin: 0 0 5px 0; color: var(--dark);">${cli.nome}</h4>
                <p style="margin: 2px 0; font-size: 0.82rem;"><strong>CPF:</strong> ${cli.cpf}</p>
                <p style="margin: 2px 0; font-size: 0.82rem; color: #64748b;"><strong>E-mail:</strong> ${cli.email}</p>
                <button class="btn-danger-sm" style="margin-top: 8px; width: 100%; background-color: #ef4444; border-radius: 4px;" onclick="removerUsuarioAdmin(${cli.id})">Excluir Cadastro</button>
            </div>
        `;
        gridUsuarios.appendChild(cardCli);
    });
}

// Ação para o Admin deletar uma conta de usuário cadastrada
window.removerUsuarioAdmin = function(id) {
    const usuarioParaRemover = clientes.find(c => c.id === id);
    if (!usuarioParaRemover) return;

    if (confirm(`Aviso: Tem certeza que deseja deletar permanentemente o cadastro de "${usuarioParaRemover.nome}"?`)) {
        // Remove dos clientes
        clientes = clientes.filter(c => c.id !== id);
        localStorage.setItem('clientes', JSON.stringify(clientes));
        
        // Dá baixa também em possíveis empréstimos antigos atrelados a esse nome
        emprestimos = emprestimos.filter(e => e.leitor !== usuarioParaRemover.nome);
        localStorage.setItem('emprestimos', JSON.stringify(emprestimos));
        
        // Recarrega as duas views do admin
        renderizarCardsAdmin();
        renderizarGerenciamentoUsuarios();
    }
};