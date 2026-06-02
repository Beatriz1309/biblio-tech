// =========================================================================
// 1. GERENCIAMENTO DE ESTADO & DADOS FICTÍCIOS
// =========================================================================
const pessoasFicticias = [
    { id: 101, nome: "Ana Silva Oliveira", cpf: "12345678901", email: "ana.silva@email.com" },
    { id: 102, nome: "Bruno Medeiros Costa", cpf: "98765432100", email: "bruno.costa@email.com" },
    { id: 103, nome: "Carlos Eduardo Souza", cpf: "45678912311", email: "cadu.souza@email.com" },
    { id: 104, nome: "Mariana Rocha Lima", cpf: "78912345622", email: "mari.rocha@email.com" }
];

// Inicia os clientes com os fictícios caso o localStorage esteja vazio
let clientes = JSON.parse(localStorage.getItem('clientes'));
if (!clientes || clientes.length === 0) {
    clientes = pessoasFicticias;
    localStorage.setItem('clientes', JSON.stringify(clientes));
}

let emprestimos = JSON.parse(localStorage.getItem('emprestimos')) || [];
let livroSelecionado = null; // Memória temporária da página de busca

// =========================================================================
// 2. EXECUTOR POR PÁGINA (Roteador Simples)
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("form-login")) {
        inicializarPaginaLogin();
    } else if (document.getElementById("form-cadastro")) {
        inicializarPaginaCadastro();
    } else if (document.getElementById("input-busca")) {
        inicializarPaginaPainel();
    }
});

// =========================================================================
// 3. LÓGICA DA PÁGINA: LOGIN (index.html)
// =========================================================================
function inicializarPaginaLogin() {
    const selectLogin = document.getElementById('select-login');
    const formLogin = document.getElementById('form-login');

    // Alimenta o Select com os leitores salvos
    selectLogin.innerHTML = '<option value="">-- Escolha seu perfil de acesso --</option>';
    clientes.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.nome} (${c.email})`;
        selectLogin.appendChild(opt);
    });

    formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const idSelecionado = selectLogin.value;
        const usuarioLogado = clientes.find(c => c.id == idSelecionado);

        if (usuarioLogado) {
            // Salva em uma chave temporária para a outra página saber quem logou
            localStorage.setItem('usuarioSessao', JSON.stringify(usuarioLogado));
            // Redireciona o navegador para a página do painel
            window.location.href = "painel.html";
        }
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
            alert("Tratamento de erro: Por favor, preencha todos os campos do formulário.");
            return;
        }

        const novoCliente = { id: Date.now(), nome, cpf, email };
        clientes.push(novoCliente);
        localStorage.setItem('clientes', JSON.stringify(clientes));

        alert(`Sucesso! ${nome} foi integrado ao banco local.`);
        window.location.href = "index.html"; // Retorna para o login para usar o novo usuário
    });
}

// =========================================================================
// 5. LÓGICA DA PÁGINA: PAINEL (painel.html)
// =========================================================================
function inicializarPaginaPainel() {
    // Recupera a sessão ativa do usuário
    const usuarioSessao = JSON.parse(localStorage.getItem('usuarioSessao'));
    if (!usuarioSessao) {
        alert("Acesso negado. Por favor, realize o login primeiro.");
        window.location.href = "index.html";
        return;
    }

    // Atualiza nomes na tela
    document.getElementById('usuario-logado-nome').textContent = usuarioSessao.nome;
    document.getElementById('checkout-cliente-nome').textContent = usuarioSessao.nome;

    // Elementos de tela
    const inputBusca = document.getElementById('input-busca');
    const btnBuscar = document.getElementById('btn-buscar');
    const loading = document.getElementById('loading');
    const resultadoBusca = document.getElementById('resultado-busca');
    const btnFinalizar = document.getElementById('btn-finalizar-emprestimo');
    const livroStatus = document.getElementById('livro-selecionado-status');
    const btnLogout = document.getElementById('btn-logout');

    // Renderiza empréstimos iniciais
    renderizarEmprestimosAtivos();

    // Evento do botão Buscar
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
                resultadoBusca.innerHTML = `<p style="color:var(--danger); font-weight:bold;">Nenhum livro localizado para "${termo}". Certifique-se do título.</p>`;
                return;
            }

            // Exibir as 3 primeiras ocorrências encontradas
            const filtrados = data.docs.slice(0, 3);
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
                        <button class="btn-sm-primary" onclick="vincularLivroCheckout('${titulo.replace(/'/g, "\\'")}', '${capaUrl}')">Selecionar para Empréstimo</button>
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

    // Função de Seleção de Livro (Injetada no escopo global window para o onclick do HTML dinâmico)
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

    // Evento de Gravação do Empréstimo
    btnFinalizar.addEventListener('click', () => {
        if (!livroSelecionado) return;

        const dataVencimento = new Date();
        dataVencimento.setDate(dataVencimento.getDate() + 7);

        const novoEmprestimo = {
            id: Date.now(),
            leitor: usuarioSessao.nome,
            livro: livroSelecionado.titulo,
            capa: livroSelecionado.capa,
            vencimento: dataVencimento.toLocaleDateString('pt-BR')
        };

        emprestimos.push(novoEmprestimo);
        localStorage.setItem('emprestimos', JSON.stringify(emprestimos));

        alert(`Empréstimo registrado! Devolução agendada para: ${novoEmprestimo.vencimento}`);

        // Reset de estado
        livroSelecionado = null;
        livroStatus.className = "status-vazio";
        livroStatus.innerHTML = `<p>Nenhum livro selecionado para esta conta ainda.</p>`;
        btnFinalizar.disabled = true;
        resultadoBusca.innerHTML = '';
        inputBusca.value = '';

        renderizarEmprestimosAtivos();
    });

    // Logout
    btnLogout.addEventListener('click', () => {
        localStorage.removeItem('usuarioSessao');
        window.location.href = "index.html";
    });
}

// Renderizador da lista inferior de empréstimos
function renderizarEmprestimosAtivos() {
    const gridEmprestimos = document.getElementById('grid-emprestimos');
    if (!gridEmprestimos) return;
    
    gridEmprestimos.innerHTML = '';

    if (emprestimos.length === 0) {
        gridEmprestimos.innerHTML = `<p style="grid-column: 1/-1; color: #64748b; text-align:center;">Nenhum livro circulando no momento.</p>`;
        return;
    }

    emprestimos.forEach(emp => {
        const card = document.createElement('div');
        card.className = 'card-ativo';
        card.innerHTML = `
            <img src="${emp.capa}" alt="Capa">
            <div class="card-ativo-corpo">
                <h4>${emp.livro}</h4>
                <p>Leitor: <strong>${emp.leitor}</strong></p>
                <p>Devolução: <span class="data-alerta">${emp.vencimento}</span></p>
                <button class="btn-danger-sm" style="margin-top:5px;" onclick="cancelarEmprestimo(${emp.id})">Devolver</button>
            </div>
        `;
        gridEmprestimos.appendChild(card);
    });
}

// Ação de Devolução
window.cancelarEmprestimo = function(id) {
    if (confirm("Dar baixa e registrar retorno físico deste livro para as prateleiras?")) {
        emprestimos = emprestimos.filter(e => e.id !== id);
        localStorage.setItem('emprestimos', JSON.stringify(emprestimos));
        renderizarEmprestimosAtivos();
    }
};