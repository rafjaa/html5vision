// FIXIT: ao iniciar, evitar que uma frase seja falada antes da mensagem 
// de inicialização (usando API de síntese de fala).

$(document).ready(function(){    
    window.addEventListener('online',atualizarStatusOnline);
    window.addEventListener('offline',atualizarStatusOnline);

    //Se houver áudio em reprodução, recebe verdadeiro.
    reproduzindo_audio = false;

    // Evento de clique na tela (pause/continue)
    video_pausado = false;

    timeoutDeteccao = undefined;
    timeoutDeteccaoQRCode = undefined;

    /*
        Parametros de áudio padrão. O único valor que poderá ser alterado pelo
        usuário é o gênero da voz (trocando o valor da chave variant).
        Parametros: variant: variação de características da voz,
        speed: velocidade de fala, pitch: afinação, amplitude: volume
    */
    parametros_audio = {variant: 'f2', speed: 160, pitch: 60, amplitude: 100};

    var detector = [];
    var ultimo_obj_detectado = ''; 
    var deteccao_pausada = true;
    var parametros_conf = carregarConfiguracoes();
    
    atualizarStatusOnline();
    
    // Constrói as checkboxes na tela de configuração, e configura as opções.
    construirCheckboxes();
    configurarMenuConf(parametros_conf);
    // Inizializa a variável abaixo após construir os checkboxes.
    divGeneroDaVoz = $('#conf-vozes');

    //Troca a variação de voz, de acordo com o selecionado
    trocaVariacaoDeAudio(parametros_conf.voz);    

    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    canvas.hidden = true;
    ctx = canvas.getContext( '2d' );
    ctx.scale(.3,.3);
 
    /*
        Posterga a reprodução da mensagem de inicialização, para dar tempo de a voz
        da API de síntese de áudio ser carregada.
    */
    setTimeout(function(){
        //Mensagem de inicialização
        reproduzirAudio('Aplicativo inicializado. Toque na tela para pausar.');
        deteccao_pausada = false;
    },2000);

    /*
        Traz a tela de configurações ao clicar no botão.
    */
    $('#config-btn').click(function(){
        // Trata os eventos de clique nos botões '+' e '-', de configuração de precisão.
        trataConfiruracaoDePrecisao();

        // Ao abrir a tela de configurações, pausa as detecções de objetos e códigos QR.
        clearTimeout(timeoutDeteccao);
        clearTimeout(timeoutDeteccaoQRCode);
        deteccao_pausada = true;

        // Exibe o div do genero da voz apenas se o audio nativo está disponivel
        if(usarAudioNativo && (navegadorOnline || speechApiObj.localService)){
            divGeneroDaVoz.hide(0);
        }else{
            divGeneroDaVoz.show(0);
        }

        if($('#modal-config').hasClass('hidden-modal')){
            
            $('#modal-config').removeClass('hidden-modal').addClass('visible');
            $('#overlay').removeClass('hidden').addClass('visible');

            $( "#config-btn" ).fadeOut( 0.8, function() {
                // Animação completa.
            });
            $( "#info-btn" ).fadeOut( 0.8, function() {
                // Animação completa.
            });
            $( "#fullscreen-btn" ).fadeOut( 0.8, function() {
                // Animação completa.
            });
            $( "#close-li").removeClass("hidden");

        }else{
            $('#modal-config').removeClass('visible');
            $('#overlay').removeClass('visible');
            $('#modal-config').addClass('hidden-modal');
            $('#overlay').addClass('hidden');
            $( "#close-li").addClass("hidden");
        }
    });

    // Janela de informações do aplicativo
    document.getElementById('info-btn').onclick = function(){
        if($('#modal-info').hasClass('hidden-modal')){
            
            $('#modal-info').removeClass('hidden-modal').addClass('visible');
            $('#overlay').removeClass('hidden').addClass('visible');

            $( "#config-btn" ).fadeOut( 0.8, function() {
                // Animação completa.
            });
            $( "#info-btn" ).fadeOut( 0.8, function() {
                // Animação completa.
            });
            $( "#fullscreen-btn" ).fadeOut( 0.8, function() {
                // Animação completa.
            });
            $( "#close-li").removeClass("hidden");

        }else{
            $('#modal-info').removeClass('visible');
            $('#overlay').removeClass('visible');
            $('#modal-info').addClass('hidden-modal');
            $('#overlay').addClass('hidden');
            $( "#close-li").addClass("hidden");
        }
    }

    /*
        Fecha a tela de configurações ao clicar no botão e cancela as alterações realizadas.
    */
    $("#close-modal-btn").click(function(){
        if(!$('#modal-config').hasClass('hidden-modal')){
            fechaModal('modal-config');

            //Se o usuário cancela a operação, as configurações anteriores são carregadas
            configurarMenuConf(parametros_conf);    

        }else{ // Fecha o modal de informação
            fechaModal('modal-info');
        }


        deteccao_pausada = false;
    });

    /*
        Salva as configurações na variável global parametros_conf e no local Storage se possível.
    */
    $("#aplicar").click(function(){
        deteccao_pausada = false;
        
        var radio_masc = document.getElementById('masculino');
        var radio_fem = document.getElementById('feminino');
        var keys = Object.keys(parametros_conf.objetos_a_detectar);
        var length = keys.length;

        if(radio_masc.checked)
            var genero_selecionado = radio_masc.value;
        else{
            var genero_selecionado = radio_fem.value;
        }

        for (var i = 0; i < length; i++){
            var key = keys[i];
            var elem = document.getElementById(key);

            parametros_conf.objetos_a_detectar[key] = elem.checked;
        }

        parametros_conf.precisao_minima_deteccao = parseInt(document.getElementById('valor-precisao').innerHTML);
        parametros_conf.voz = genero_selecionado;
        
        salvarConfiguracoes(parametros_conf);
        fechaModal('modal-config');
        trocaVariacaoDeAudio(genero_selecionado);
    });

    $('#corpo').click(function(){
        reproduzindo_audio = true;

        if(!video_pausado){
            reproduzirAudio('Pausado. Toque na tela para continuar.');
            video_pausado = true;
        }else{
            reproduzirAudio('Executando. Toque na tela para pausar.');
            video_pausado = false;
        }
    });

    $('#fullscreen-btn').click(function(){
        if (screenfull.enabled){
            screenfull.toggle();
        }
        var fullscreen_toggle = $('#fullscreen-toggle');
        var txt = fullscreen_toggle.html();

        if (txt == 'fullscreen_exit')
            fullscreen_toggle.html('fullscreen');
        else
            fullscreen_toggle.html('fullscreen_exit');
    });

    var gotSources = function(sourceInfos){
        id_source = null;

        for (var i = 0; i != sourceInfos.length; ++i){
            var sourceInfo = sourceInfos[i];
            if(sourceInfo.kind != 'audio'){
                id_source = sourceInfo.id;
            }
        }

        try{
            if(id_source == null){
                var parametros = {video: true};
            } else{
                var parametros = {video: {optional: [{sourceId: id_source}]}};
            }
            compatibility.getUserMedia(parametros, function(stream){
                try{
                    video.src = compatibility.URL.createObjectURL(stream);
                }catch(error){
                    video.src = stream;
                }
                compatibility.requestAnimationFrame(play);

            }, function(error){
                //alert('Não foi possível acessar a câmera');
            });

        }catch(error) {
            alert('Ocorreu um erro: ' + error);
        }
    }//gotSources

    // Se houver mais de uma câmera, obtém a frontal
    if (typeof MediaStreamTrack === 'undefined'){
        gotSources([]);
    } else {
        MediaStreamTrack.getSources(gotSources);
    }                
    
    play = function(){
        compatibility.requestAnimationFrame(play);
        
        if(video_pausado){
            if(!video.paused){
                video.pause();
            }
            return;
        }else{
            if (video.paused){ 
                video.play();
            }
        }
        
        if(video.readyState !== video.HAVE_ENOUGH_DATA)
            return;
        canvas.hidden = true;
        video.hidden = false;

        if(deteccao_pausada == true){
            return;
        }
        
        if(reproduzindo_audio == false){
            var dados  = ''; 
            ctx.drawImage(video, 0, 0);

            
            if(parametros_conf.objetos_a_detectar['qrcode']){
                //Detectando QR Codes
                try{
                    var dados = qrcode.decode();
                    reproduzirAudio(dados);
                    deteccao_pausada = true;
                    timeoutDeteccaoQRCode = setTimeout(function(){
                        deteccao_pausada = false;
                    },3000);
                }catch(e){
                   console.log('Erro ao decodificar QRCode: ' + e);
                }
            }
        }
        
        var width = ~~(80 * video.videoWidth / video.videoHeight), height = 80 ;
        for(i in haar_cascade){
            if(!detector[i])
                detector[i] = new objectdetect.detector(width, height, 1.1, haar_cascade[i]['classifier']);
        }//for  
        
        for(i in haar_cascade){
            if(typeof(detector[i]) == 'function') continue;

            //Pula a detecção do objeto que está desativado nas configurações
            if(parametros_conf.objetos_a_detectar[haar_cascade[i].id] === false){
              //  console.log('parando a execucao corrente\n'+
              //      'parametros_conf:',parametros_conf.objetos_a_detectar[haar_cascade[i].id],
              //      'haar_cascade:',haar_cascade[i].id)
                continue;
            }
                        
            var coords = detector[i].detect(video,1);
            if(coords.length == 0) 
                continue;
            if(coords[0][4] < parametros_conf.precisao_minima_deteccao)
                continue;
            
            var obj = coords[0];

            video.hidden = true;
            canvas.hidden = false;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        
            //Reescalonando as coordenadas do detector para as coordenadas do vídeo.
            obj[0] *= video.videoWidth / detector[i].canvas.width;
            obj[1] *= video.videoHeight / detector[i].canvas.height;
            obj[2] *= video.videoWidth / detector[i].canvas.width;
            obj[3] *= video.videoHeight / detector[i].canvas.height;

            ctx.drawImage(video, 0, 0);
            ctx.strokeStyle = 'rgba(255,0,0,1)';
            ctx.lineWidth = '4';
            ctx.strokeRect(obj[0], obj[1], obj[2], obj[3]);

            var descricao = haar_cascade[i]['descricao'];
            ctx.font = '25px Roboto'; 
            ctx.fillStyle = 'rgb(255,0,0)';
            
            ctx.shadowColor = 'black';
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            ctx.fillText(descricao, obj[0], obj[1] + obj[3] + 25);
        
            if(!reproduzindo_audio){
                console.log('reproduzindo audio da deteccao de: ' + haar_cascade[i]['descricao']);
                reproduzirAudio(haar_cascade[i]['descricao']);
                ultimo_obj_detectado = descricao; 
                deteccao_pausada = true;
                timeoutDeteccao = setTimeout(function(){
                    deteccao_pausada = false;   
                },5000);
            }
        }//for
    }//function()
});

// Armazena o objeto da API de fala nativa do browser (se disponível).
speechApiObj = undefined;
// Recebe verdadeiro, se a APi de fala do browser com voz em português brasileiro estiver disponível.
usarAudioNativo = false;
// Variável auxiliar para verificar se o navegador está conectado a internet.
navegadorOnline = undefined;
// Armazena a referência da div contendo o div de configuração de gênero de voz,
// que será escondido quando o meSpeak não for utilizado.
divGeneroDaVoz = undefined;
/*
    Configura os inputs do menu de configurações com as informações
    contidas na variável passada por parâmetro.
*/
var configurarMenuConf = function(conf){
    // Carrega o valor da precisão de detecção
    document.getElementById('valor-precisao').innerHTML = conf.precisao_minima_deteccao;

    // Carrega o gênero da voz
    document.getElementById(conf.voz).checked = true;

    // Carrega as checkboxes
    var keys = Object.keys(conf.objetos_a_detectar);

    for (var i = 0; i < keys.length; i++){
        var key = keys[i];
        document.getElementById(key).checked = conf.objetos_a_detectar[key];
    }
}

/*
    Carrega as configurações iniciais do aplicativo.
    Se for a primeira execução, salva no localStorage, se possível.
    Se não for a primeira vez, e houver localStorage, as configurações no localStorage são recuperadas.
*/
var carregarConfiguracoes = function(){
    var parametros_conf_padrao = {voz:'feminino',precisao_minima_deteccao: 70,objetos_a_detectar:[{'qrcode':true}]};
    var parametros_conf;
    var length = haar_cascade.length;
    
    var json = {qrcode:true}
    for(var i=0;i < length; i++){
        json[haar_cascade[i].id] = true;
    }
    console.log('objetos: ',json);

    parametros_conf_padrao.objetos_a_detectar = json;

    if(window.localStorage){
        if(localStorage['parametros_conf']){
            //Carregando do localStorage
            parametros_conf = JSON.parse(window.localStorage['parametros_conf']);
            console.log('Carregado do localStorage');
        }else{
            //Salvando no localStorage
            parametros_conf = parametros_conf_padrao;
            window.localStorage['parametros_conf'] = JSON.stringify(parametros_conf);
            console.log('Salvo no localStorage');
        }
    }else{
        //Sem suporte a localStorage. As configurações padrão são carregadas.
        parametros_conf = parametros_conf_padrao;
        console.log('localStorage não disponível');
    }
    console.log('Informações Carregadas:\n',parametros_conf);
    return parametros_conf;
}

/*
    Salva as configurações no localStorage, se disponível.
*/
var salvarConfiguracoes = function(conf){
    if(window.localStorage){
        window.localStorage['parametros_conf'] = JSON.stringify(conf);
    }
    console.log('Salvo no localStorage:\n',conf);
}

/*
    Fecha o modal relacionado ao ID passado como parâmetro.
*/
var fechaModal = function(id_objeto){
    var id_objeto = '#' + id_objeto;

    if($("#overlay").hasClass('visible')){

        $(id_objeto).removeClass('visible').addClass('hidden-modal');

        $("#overlay").removeClass('visible').delay(200).queue(function(){
            $(this).addClass('hidden').dequeue();
        });

        $( "#config-btn" ).fadeIn( 0.8, function() {
            // Animation complete.
        });
        $( "#info-btn" ).fadeIn( 0.8, function() {
            // Animation complete.
        });
        $( "#fullscreen-btn" ).fadeIn( 0.8, function() {
            // Animation complete.
        });
        $( "#close-li").addClass("hidden");
    }
}

/*
    Recebe como parametro o id do objeto selecionado no div de
    gênero da voz, e troca o genero da voz com o valor do atributo
    contido na tag (data attribute), a variação da voz.
*/
var trocaVariacaoDeAudio = function(id_objeto){
    parametros_audio.variant = document.getElementById(id_objeto).getAttribute('data-variacao-voz');
    console.log('TROCA VARIACAO DE AUDIO: ',parametros_audio);
}

/*
    Configura a API de síntese de fala, se está presente no navegador. 
    Recebe como parâmetro a voz a ser utilizada (portugês do Brasil).
*/
var inicializaAPIDeFalaNativa = function(voice){
    if (!'speechSynthesis' in window || !'SpeechSynthesisUtterance' in window){
        console.log('speechSynthesis ou SpeechSynthesisUtterance não presente.');
        return null;
    }

    speechApiObj = new SpeechSynthesisUtterance();
    speechApiObj.voice = voice;
    speechApiObj.voiceURI = voice.voiceURI || 'Google português do Brasil';
    speechApiObj.name = voice.name || 'Google português do Brasil';
    speechApiObj.lang = voice.lang || 'pt-BR';
    speechApiObj.localService = voice.localService;
    speechApiObj.volume = 1; // 0 to 1
    speechApiObj.rate = 1; // 0.1 to 10
    speechApiObj.pitch = 1; //0 to 2
    speechApiObj.text = '';
    

    speechApiObj.onstart = function(e){
        console.log('Audio "', e.utterance.text, '" iniciado.');
        reproduzindo_audio = true;
    };
    speechApiObj.onend = function(e) {
      console.log('Audio "',e.utterance.text,'" reproduzido.');
      reproduzindo_audio = false;
    };
    speechApiObj.onerror = function(e) {
      console.log('Erro na reprodução de "',e.utterance.text, '"');
      reproduzindo_audio = false;
      usarAudioNativo = false;
    };
    console.log('API de fala iniciada:\n',speechApiObj);
}

/*
    As vozes da API de síntese de fala são carregadas de forma assíncrona.
    Esta função é chamada quando estas vozes são carregadas.
    Se houver voz em português do Brasil disponível, inicializa os parâmetros da API de síntese de fala.
*/
window.speechSynthesis.onvoiceschanged = function(){
    var voices = window.speechSynthesis.getVoices();
    var voice = voices.filter(function(voice) {
        return voice.lang == 'pt-BR' || voice.lang == 'pt_BR';
    })[0];
    
    if(!voice){
        usarAudioNativo = false;
        console.log('Voz nativa não carregada')
        return;
    }
    
    console.log('Voz nativa carregada: ', voice);

    usarAudioNativo = true;
    inicializaAPIDeFalaNativa(voice);
}

/*
    Reproduz as mensagens do aplicativo. Se estiver disponível API de síntese de fala, esta é usada,
    se não, a API do meSpeak é utilizada.
*/
var reproduzirAudio = function(msg){
    //Usa a API de áudio nativa se o navegador tem conexão a internet, ou está disponível localmente.
    if(usarAudioNativo && (navegadorOnline || speechApiObj.localService)){
        // Cancela a execução de algum áudio em reprodução, e remove o áudio, 
        // se estiver na fila de reprodução.
        window.speechSynthesis.cancel();

        speechApiObj.text = msg;
        window.speechSynthesis.speak(speechApiObj);

    }else{//Reproduzir audio usando meSpeak
        if(!meSpeak.isConfigLoaded()){
            meSpeak.loadConfig('static/json/mespeak_config.json');
        }
        
        if (!meSpeak.isVoiceLoaded('pt')){
            meSpeak.loadVoice('static/json/mespeak_voice_pt.json')
        }

        meSpeak.stop();
        reproduzindo_audio = true;
        meSpeak.speak(msg, parametros_audio, function(finalizado){
            if(finalizado){
                reproduzindo_audio = false;
            }
        });
    }
}

/*
    Constrói as checkboxes da tela de configurações dinamicamente
*/
var construirCheckboxes = function(){

    var divcheckboxes = $('#checkboxes');
    for (var i =0;i< haar_cascade.length; i++){

        var novoinput = $('<input checked type="checkbox" name="objetos-detectados" id="' + 
            haar_cascade[i].id + '"><label for="' + haar_cascade[i].id + 
            '"> ' + haar_cascade[i].descricao +'</label><br/>');

        divcheckboxes.append(novoinput);
    }
}

/*
    Chamado a cada vez que o navegador muda o estado de conexão.
*/
var atualizarStatusOnline = function(){
    if(navigator.onLine){
        navegadorOnline = true;
    }else{
        navegadorOnline = false;
    }
    
    console.log('navegador online: ' + navegadorOnline);
}

/*
    Trata os eventos de clique nos botões '+' e '-' na tela de configurações.
*/
var trataConfiruracaoDePrecisao = function(){
    var elem_valor_precisao = document.getElementById('valor-precisao');
    var elem_decrementa_precisao = document.getElementById('decrementa-precisao');
    var elem_incrementa_precisao = document.getElementById('incrementa-precisao');
    var value;
    var limite_inferior_deteccao = 1;
    var limite_superior_deteccao = 100;

    elem_incrementa_precisao.onclick = function(){
        value = parseInt(elem_valor_precisao.innerHTML);
        var new_value = value + 1;

        // Se o valor atual é menor que o limite superior, o valor é incrementado
        if (value < limite_superior_deteccao){
            elem_valor_precisao.innerHTML = new_value;

            // Se o valor antigo era igual ao limite inferior, o botão '-' é 'desbloqueado'
            if(value == limite_inferior_deteccao){
                elem_decrementa_precisao.style.opacity = 1;
                elem_decrementa_precisao.disabled = false;
            }
        }

        // Se o novo valor é igual ao limite superior, o botão '+' é 'bloqueado'.
        if (new_value == limite_superior_deteccao){
            this.style.opacity = '0.3';
            this.disabled = true;
        }
    }

    elem_decrementa_precisao.onclick = function(){
        value = parseInt(elem_valor_precisao.innerHTML);
        var new_value = value - 1;

        // Se o valor atual é maior que o limite inferior, o valor é decrementado
        if (value > limite_inferior_deteccao){
            elem_valor_precisao.innerHTML = new_value;

            // Se o valor antigo era igual ao valor máximo, o botão '+' deve ser 'desbloqueado'
            if(value == limite_superior_deteccao){
                elem_incrementa_precisao.style.opacity = 1;
                elem_incrementa_precisao.disabled = false;
            }
        }

        // Se o novo valor é igual ao limite inferior, o botão '-' é 'bloqueado'
        if (new_value == limite_inferior_deteccao){
            this.style.opacity = '0.3';
            this.disabled = true;
        }
    }
}