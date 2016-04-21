$(document).ready(function(){

    /*
        Constrói as comboboxes dinamicamente
    */

    var divcheckboxes = $('#checkboxes');
    for (var i =0;i< haar_cascade.length; i++){
        //console.log(haar_cascade[i].descricao);
        var novoinput = $('<input checked type="checkbox" name="objetos-detectados" id="' + 
            haar_cascade[i].id + '"><label for="' + haar_cascade[i].id + 
            '">' + haar_cascade[i].descricao +'</label><br/>');

        divcheckboxes.append(novoinput);
    }


    /*
        Traz a tela de configurações ao clicar no botão.
    */

    $('#config-btn').click(function(){
        if($('#modal-config').hasClass('hidden-modal')){
            $('#modal-config').removeClass('hidden-modal');
            $('#overlay').removeClass('hidden');
            $('#modal-config').addClass('visible');
            $('#overlay').addClass('visible');

            $( "#config-btn" ).fadeOut( 0.8, function() {
                // Animation complete.
            });
            $( "#info-btn" ).fadeOut( 0.8, function() {
                // Animation complete.
            });
            // TODO: trocar icone para 'close'
            $( "#fullscreen-btn" ).fadeOut( 0.8, function() {
                // Animation complete.
            });

        }else{
            $('#modal-config').removeClass('visible');
            $('#overlay').removeClass('visible');
            $('#modal-config').addClass('hidden-modal');
            $('#overlay').addClass('hidden');
        }
    });

    // Carrega e configura a API de áudio do cache, se possível(WebStorage API).
	/*Parametros: variant: variação de características da voz, 
      speed: velocidade de fala, pitch: afinação, amplitude: volume*/
	var parametros_audio_padrao = {variant: 'f2', speed: 160, pitch: 60, amplitude: 100};
	var parametros_audio;
	
	if(typeof(Storage) !== undefined){
		if(localStorage['parametros_audio'] === undefined){
            parametros_audio = parametros_audio_padrao;
			localStorage['parametros_audio'] = JSON.stringify(parametros_audio_padrao); //Saved in the cache
        }else{
			parametros_audio = JSON.parse(localStorage['parametros_audio']); //Cache loaded
        }
	}else
		parametros_audio = parametros_audio_padrao; // Without WebStorage support
		
    var reproduzindo_audio = false;
  //  var txt_audio = document.getElementById('txt_audio');
    
	meSpeak.loadConfig('static/json/mespeak_config.json');
	meSpeak.loadVoice('static/json/mespeak_voice_pt.json', function(){
        // Mensagem de inicialização
        if(!reproduzindo_audio){
            reproduzindo_audio = true;
           // $('#icone_audio').show();
           // txt_audio.innerHTML = 'Aplicativo inicializado. Toque na tela para pausar.';
            meSpeak.speak('Aplicativo inicializado. Toque na tela para pausar.', parametros_audio, callback_audio);
        }
    });
    
    // Evento de clique na tela (pause/continue)
    pausado = false;

    $('#corpo').click(function(){
        reproduzindo_audio = true;
        //$('#icone_audio').show();
        if(!pausado){
           // txt_audio.innerHTML = 'Pausado. Toque na tela para continuar.';
            meSpeak.stop();
            meSpeak.speak('Pausado. Toque na tela para continuar.', parametros_audio, callback_audio);
            pausado = true;
        }else{
           // txt_audio.innerHTML = 'Executando. Toque na tela para pausar.';
            meSpeak.stop();
            meSpeak.speak('Executando. Toque a tela para pausar.', parametros_audio, callback_audio);
            pausado = false;
        }
    });
	
    var callback_audio = function(finalizado){
        if(finalizado){
            reproduzindo_audio = false;
           // $('#icone_audio').hide();
        }
    }

    
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

            try{
                var dados = qrcode.decode();
                reproduzindo_audio = true;
                meSpeak.speak(dados, parametros_audio,callback_audio);
                deteccao_pausada = true;
                setTimeout(function(){
                    deteccao_pausada = false;
                },3000);
            }catch(e){
               //console.log('excecao: ' + e);
            }
        }
        
        var width = ~~(80 * video.videoWidth / video.videoHeight), height = 80 ;
        for(i in haar_cascade){
            if(!detector[i])
                detector[i] = new objectdetect.detector(width, height, 1.1, haar_cascade[i]['classifier']);
        }//for	
        
        for(i in haar_cascade){
            if(typeof(detector[i]) == 'function') continue;
            
            
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
        
            
         //   txt_audio.innerHTML = descricao;
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