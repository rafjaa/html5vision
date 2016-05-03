$(document).ready(function(){

    /*
        Constrói as comboboxes dinamicamente
    */

    var divcheckboxes = $('#checkboxes');
    for (var i =0;i< haar_cascade.length; i++){
        //console.log(haar_cascade[i].descricao);
        var novoinput = $('<input checobjetos_a_detectar:ked type="checkbox" name="objetos-detectados" id="' + 
            haar_cascade[i].id + '"><label for="' + haar_cascade[i].id + 
            '"> ' + haar_cascade[i].descricao +'</label><br/>');

        divcheckboxes.append(novoinput);
    }

    /*
        Traz a tela de configurações ao clicar no botão.
    */

    $('#config-btn').click(function(){
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

    /*
        Fecha a tela de configurações ao clicar no botão e cancela as alterações realizadas.
    */

    $("#close-modal-btn").click(function(){
        fechaModalDeConfiguracoes();

        //Se o usuário cancela a operação, as configurações anteriores são carregadas
        configurarMenuConf(parametros_conf);
    });


    /*
        Salva as configurações na variável global parametros_conf e no local Storage se possível.
    */

    $("#aplicar").click(function(){
        var select_opcoes = document.getElementById('select-voz');

        var genero_selecionado = select_opcoes.options[select_opcoes.selectedIndex].value;
        
        parametros_conf.voz = genero_selecionado;

        var keys = Object.keys(parametros_conf.objetos_a_detectar);
        var length = keys.length;

        for (var i = 0; i < length; i++){
            var key = keys[i];
            var elem = document.getElementById(key);

            parametros_conf.objetos_a_detectar[key] = elem.checked;
        }
        
        salvarConfiguracoes(parametros_conf);
        fechaModalDeConfiguracoes();
        trocaVariacaoDeAudio(genero_selecionado);
    });

    /*
        Parametros de áudio padrão. O único valor que poderá ser alterado pelo
        usuário é o gênero da voz (trocando o valor da chave variant).
        Parametros: variant: variação de características da voz,
        speed: velocidade de fala, pitch: afinação, amplitude: volume
    */
    parametros_audio = {variant: 'f2', speed: 160, pitch: 60, amplitude: 100};

    var parametros_conf = carregarConfiguracoes();
    configurarMenuConf(parametros_conf);

    //Troca a variação de voz, de acordo com o selecionado
    trocaVariacaoDeAudio(parametros_conf.voz);

    var reproduzindo_audio = false;
    meSpeak.loadConfig('static/json/mespeak_config.json');
    meSpeak.loadVoice('static/json/mespeak_voice_pt.json', function(){
        // Mensagem de inicialização
        if(!reproduzindo_audio){
            reproduzindo_audio = true;
            meSpeak.speak('Aplicativo inicializado. Toque na tela para pausar.', parametros_audio, callback_audio);
        }
    });
    
    // Evento de clique na tela (pause/continue)
    pausado = false;

    $('#corpo').click(function(){
        reproduzindo_audio = true;

        if(!pausado){
            meSpeak.stop();
            meSpeak.speak('Pausado. Toque na tela para continuar.', parametros_audio, callback_audio);
            pausado = true;
        }else{
            meSpeak.stop();
            meSpeak.speak('Executando. Toque na tela para pausar.', parametros_audio, callback_audio);
            pausado = false;
        }
    });
    
    var callback_audio = function(finalizado){
        if(finalizado){
            reproduzindo_audio = false;
        }
    }

    console.log(parametros_conf);

    var PRECISAO_MINIMA_DETECCAO = 7;
    var PRECISAO_MINIMA_DETECCAO_PADRAO = 7;
   
    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    canvas.hidden = true;
    ctx = canvas.getContext( '2d' );
    ctx.scale(.3,.3);
   
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
             //   txt_audio.innerHTML = 'Analisando ambiente...';
                compatibility.requestAnimationFrame(play);

            }, function(error){
                alert('Não foi possível acessar a câmera');
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
    
    var detector = [];
   
    var ultimo_obj_detectado = ''; 
    var deteccao_pausada = false;
    
    play = function(){
        compatibility.requestAnimationFrame(play);
        
        if(pausado){
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

        if(deteccao_pausada){
            return;
        }
        
        if(reproduzindo_audio == false){
            var dados  = ''; 
            ctx.drawImage(video, 0, 0);

            
            if(parametros_conf.objetos_a_detectar['qrcode']){
                //Detectando QR Codes
                try{
                    var dados = qrcode.decode();
                    reproduzindo_audio = true;
                    meSpeak.speak(dados, parametros_audio,callback_audio);
                    deteccao_pausada = true;
                    setTimeout(function(){
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
                console.log('parando a execucao corrente\n'+
                    'parametros_conf:',parametros_conf.objetos_a_detectar[haar_cascade[i].id],
                    'haar_cascade:',haar_cascade[i].id)
                continue;
            }
                        
            var coords = detector[i].detect(video,1);
            if(coords.length == 0) 
                continue;
            if(coords[0][4] < PRECISAO_MINIMA_DETECCAO) 
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
                reproduzindo_audio = true;
                meSpeak.stop();
                meSpeak.speak(haar_cascade[i]['descricao'],parametros_audio,callback_audio);
                ultimo_obj_detectado = descricao; 
                deteccao_pausada = true;
                setTimeout(function(){
                    deteccao_pausada = false;   
                },3000);
            }
        }//for
    }//function()
});

/*
    Configura os inputs do menu de configurações com as informações
    continas na variável passada por parâmetro.
*/
var configurarMenuConf = function(conf){
    //Carrega o gênero da voz
    document.getElementById(conf.voz).selected = true;

    //Carrega as checkboxes
    var keys = Object.keys(conf.objetos_a_detectar);feminina

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
    var parametros_conf_padrao = {voz:'feminina',objetos_a_detectar:[{'qrcode':true}]};
    var parametros_conf;
    var length = haar_cascade.length;
    
    var json = {qrcode:true}
    for(var i=0;i < length; i++){
        json[haar_cascade[i].id] = true;
    }
    console.log('objetos: ',json);

    parametros_conf_padrao.objetos_a_detectar = json;

    if(window.localStorage){
        if(localStorage['parametros_conf'] === undefined){
            //Salvando no localStorage
            parametros_conf = parametros_conf_padrao;
            window.localStorage['parametros_conf'] = JSON.stringify(parametros_conf);
            console.log('Salvo no localStorage');
        }else{
            //Carregando do localStorage
            parametros_conf = JSON.parse(window.localStorage['parametros_conf']);
            console.log('Carregado do localStorage');
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
    Fecha o modal de configurações.
*/
var fechaModalDeConfiguracoes = function(){
    if($("#overlay").hasClass('visible')){

        $("#modal-config").removeClass('visible').addClass('hidden-modal');

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
    Recebe como parametro o id do objeto selecionado no select de
    gênero da voz, e troca o genero da voz com o valor do atributo
    contido na tag (data attribute), a variação da voz.
*/
var trocaVariacaoDeAudio = function(id_objeto){
    parametros_audio.variant = document.getElementById(id_objeto).getAttribute('data-variacao-voz');
    console.log('TROCA VARIACAO DE AUDIO: ',parametros_audio);
}