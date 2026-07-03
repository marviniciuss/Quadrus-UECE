# Regras de Negócio do Planning Poker

Este documento registra o funcionamento detalhado da funcionalidade de **Planning Poker** no projeto Quadrus, conforme especificado pelo usuário:

1. **Início da Votação:**
   - O **PO** ou o **Gerente** de um projeto podem iniciar a votação da pontuação de um card.
   - Ao iniciar, todos os membros com o perfil `DEV` do projeto devem ser notificados.
   - O PO/Gerente define a duração da votação (com limite máximo de **até 24 horas**).

2. **Fluxo de Votação (Desenvolvedores):**
   - Os desenvolvedores (`DEV`) votam de maneira **anônima**.
   - Para votar, o dev clica no número desejado (opções: `[1, 2, 3, 5, 8, 13, 21, ?]`) e depois clica no botão **"Votar"**.
   - O desenvolvedor pode **cancelar ou alterar seu voto** a qualquer momento antes do encerramento do prazo.

3. **Visualização Parcial (Durante a Votação):**
   - Enquanto a votação estiver ativa, a interface exibe para todos os membros **apenas a quantidade de votos** acumulados em cada pontuação (ex: "3 votos" no número 8, "1 voto" no número 3, "2 votos" no número 5), sem revelar quem votou em qual opção.

4. **Encerramento da Votação e Decisão:**
   - Após o prazo da votação expirar, o **PO** e o **Gerente** recebem uma notificação de encerramento.
   - Com a votação encerrada, o PO/Gerente pode visualizar os votos detalhados enviando a pontuação.
   - O PO/Gerente então decide a pontuação definitiva do card clicando na pontuação desejada e pressionando o botão **"Decidir Pontuação"**.
