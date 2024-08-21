function processFile() {
    // Obtém o primeiro arquivo selecionado no input de arquivos
    const file = document.getElementById('fileInput').files[0];
    
    // Verifica se um arquivo foi selecionado
    if (!file) {
        // Se nenhum arquivo foi selecionado, exibe uma mensagem ao usuário
        document.getElementById('result').textContent = "Por favor, selecione um arquivo.";
        return; // Encerra a função se não houver arquivo
    }

    // Define os tipos de arquivos válidos (imagens e PDFs)
    const validFileTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    
    // Verifica se o arquivo selecionado é de um tipo válido
    if (!validFileTypes.includes(file.type)) {
        // Se o tipo de arquivo não for suportado, exibe uma mensagem de erro
        document.getElementById('result').textContent = "Formato de arquivo não suportado. Por favor, envie uma imagem ou PDF.";
        return; // Encerra a função se o tipo for inválido
    }

    // Exibe uma mensagem indicando que o processamento está em andamento
    document.getElementById('result').textContent = "Processando...";

    // Verifica se o arquivo é um PDF ou uma imagem e chama a função apropriada
    if (file.type === 'application/pdf') {
        processPDF(file); // Processa o arquivo PDF
    } else {
        processImage(file); // Processa o arquivo de imagem
    }
}

function processImage(file) {
    // Usa o Tesseract.js para reconhecer texto na imagem
    Tesseract.recognize(file, 'eng', {
        //logger: m => console.log(m) // Loga o progresso do OCR no console
    }).then(({ data }) => {
        // Chama a função para processar o texto extraído
        processText(data.text);
        console.table(data.text, 'teste');
    }).catch(error => {
        // Em caso de erro, loga o erro no console e exibe uma mensagem de erro na página
        console.error(error);
        document.getElementById('result').textContent = `Erro ao processar o arquivo: ${error.message}`;
    });
}

function processPDF(file) {
    // Carrega o PDF usando pdf.js
    const loadingTask = pdfjsLib.getDocument(URL.createObjectURL(file));
    
    // Quando o PDF for carregado com sucesso
    loadingTask.promise.then(pdf => {
        let totalText = ''; // Inicializa uma string para armazenar o texto extraído
        console.log(totalTex,'totalTex');
        const promises = []; // Armazena as promessas de processamento das páginas do PDF

        // Itera sobre cada página do PDF
        for (let i = 1; i <= pdf.numPages; i++) {
            // Adiciona a promessa de processamento de cada página ao array de promessas
            promises.push(
                pdf.getPage(i).then(page => {
                    // Configura o viewport para renderizar a página em um canvas
                    const viewport = page.getViewport({ scale: 1.9 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    // Renderiza a página no canvas e, em seguida, processa a imagem gerada com Tesseract
                    return page.render({ canvasContext: context, viewport: viewport }).promise.then(() => {
                        return Tesseract.recognize(canvas, 'eng').then(({ data }) => {
                            totalText += data.text + '\n'; // Adiciona o texto extraído à string totalText
                        });
                    });
                })
            );
        }

        // Quando todas as páginas forem processadas, chama a função para processar o texto extraído
        Promise.all(promises).then(() => {
            processText(totalText);
        }).catch(error => {
            // Em caso de erro durante o processamento das páginas, loga o erro no console e exibe uma mensagem de erro na página
            console.error(error);
            document.getElementById('result').textContent = `Erro ao processar o PDF: ${error.message}`;
        });
    }).catch(error => {
        // Em caso de erro ao carregar o PDF, loga o erro no console e exibe uma mensagem de erro na página
        console.error(error);
        document.getElementById('result').textContent = `Erro ao carregar o PDF: ${error.message}`;
    });
}

function processText(text) {
    const lines = text.split('\n');
    let totalCalculated = 0;
    let totalDeclared = 0;

    console.log('Linhas extraídas:', lines);

    lines.forEach(line => {
        // Extrai valores monetários com suporte para diferentes formatos de separadores
        const values = line.match(/\d{1,3}(?:[,\.]\d{3})*(?:[,\.]\d{3})/);

        console.log('Valores extraídos:', values);

        if (values) {
            if (/total/i.test(line) || /total facturado antes de impuestos/i.test(line)) {
                // Converte o total declarado em número
                const declaredValues = values.map(val => parseFloat(val.replace(/\./g, '').replace(',', '.')));
                console.log('Valores declarados:', declaredValues);
                if (declaredValues.length > 0) {
                    totalDeclared = declaredValues[0];
                }
            } else {
                // Converte valores encontrados em números e soma
                const numericValues = values.map(val => parseFloat(val.replace(/\./g, '').replace(',', '.')));
                console.log('Valores numéricos:', numericValues);
                totalCalculated += numericValues.reduce((sum, num) => sum + num, 0);
            }
        }
    });

    // Exibe os totais calculado e declarado
    console.log('Total Calculado:', totalCalculated);
    console.log('Total Declarado:', totalDeclared);

    let resultMessage = '';


    if (totalDeclared) {
        resultMessage = `O valor total calculado é: ${totalCalculated.toFixed(2)}. O valor total declarado é: ${totalDeclared.toFixed(2)}. `;
        resultMessage += (Math.abs(totalCalculated - totalDeclared) < 0.01) ? 'Os valores conferem.' : 'Os valores não conferem.';
    } else {
    
        resultMessage = `O valor total calculado é: ${totalCalculated.toFixed(2)}. Não foi possível encontrar o valor total declarado no documento.`;
    }

    document.getElementById('result').textContent = resultMessage;
}






