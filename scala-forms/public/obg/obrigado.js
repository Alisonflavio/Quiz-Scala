(function () {
  var q = new URLSearchParams(window.location.search);
  var STORAGE = 'scala_obrigado';

  function pick() {
    for (var i = 0; i < arguments.length; i++) {
      var v = arguments[i];
      if (v != null && String(v).trim() !== '') return String(v).trim();
    }
    return '';
  }

  function soNumeros(v) {
    return String(v || '').replace(/\D/g, '');
  }

  function numeroReais(v) {
    if (v == null || v === '') return 0;
    var s = String(v).trim();
    if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
    var n = Number(s.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, ''));
    return isFinite(n) ? n : 0;
  }

  function lerDados() {
    var salvo = {};
    try {
      salvo = JSON.parse(sessionStorage.getItem(STORAGE) || '{}') || {};
    } catch (e) {}

    // Campos do Diagnóstico Scala (scala-forms): nome, whatsapp, renda, aumento, email, insta…
    var renda = numeroReais(pick(q.get('renda'), q.get('fatura'), salvo.renda, salvo.fatura));
    var aumento = numeroReais(pick(q.get('aumento'), salvo.aumento));
    var metaQ = numeroReais(pick(q.get('meta'), salvo.meta));
    var meta = metaQ || (renda && aumento ? renda + aumento : 0) || (renda ? renda : 0);

    return {
      nome: pick(q.get('nome'), salvo.nome),
      telefone: soNumeros(pick(q.get('telefone'), q.get('whatsapp'), q.get('phone'), salvo.telefone, salvo.whatsapp)),
      email: pick(q.get('email'), salvo.email),
      insta: pick(q.get('insta'), salvo.insta),
      renda: renda,
      aumento: aumento,
      fatura: renda,
      meta: meta,
      diagnostico: pick(q.get('diagnostico'), q.get('label'), salvo.diagnostico),
      gargalo: pick(q.get('gargalo'), salvo.gargalo),
      area: pick(q.get('area'), salvo.area),
    };
  }

  function salvarDados(dados) {
    try {
      sessionStorage.setItem(STORAGE, JSON.stringify(dados));
    } catch (e) {}
  }

  function primeiroNome(nome) {
    if (!nome) return 'Lucas';
    return nome.split(/\s+/)[0];
  }

  function formatarTelefone(digitos) {
    var d = soNumeros(digitos);
    if (d.length > 11 && d.indexOf('55') === 0) d = d.slice(2);
    if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
    if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return digitos || '(41) 99999-0000';
  }

  function formatarReais(valor) {
    var num = typeof valor === 'number' ? valor : numeroReais(valor);
    if (!num || num <= 0) return '';
    return 'R$ ' + Math.round(num).toLocaleString('pt-BR');
  }

  var dados = lerDados();
  salvarDados(dados);

  document.querySelectorAll('[data-nome]').forEach(function (el) {
    el.textContent = primeiroNome(dados.nome);
  });
  document.querySelectorAll('[data-telefone]').forEach(function (el) {
    el.textContent = formatarTelefone(dados.telefone);
  });

  var cardMeta = document.getElementById('card-meta');
  var faturaFmt = formatarReais(dados.fatura || dados.renda);
  var metaFmt = formatarReais(dados.meta);
  if (faturaFmt && metaFmt) {
    document.querySelectorAll('[data-fatura]').forEach(function (el) {
      el.textContent = faturaFmt;
    });
    document.querySelectorAll('[data-meta]').forEach(function (el) {
      el.textContent = metaFmt;
    });
    if (cardMeta) cardMeta.classList.remove('hidden');
  } else if (cardMeta) {
    // Sem renda/meta do formulário: esconde o card (não inventa número)
    cardMeta.classList.add('hidden');
  }

  // Resumo do diagnóstico (subpágina)
  [['diagnostico', dados.diagnostico], ['area', dados.area], ['gargalo', dados.gargalo]].forEach(function (par) {
    document.querySelectorAll('[data-' + par[0] + ']').forEach(function (el) {
      if (par[1]) el.textContent = par[1];
      else if (el.closest('[data-opcional]')) el.closest('[data-opcional]').classList.add('hidden');
    });
  });
  var btnVoltar = document.getElementById('btn-voltar-fim');
  if (btnVoltar) btnVoltar.addEventListener('click', function () { mostrar('fim'); });
  var btnPlano = document.getElementById('btn-ir-plano');
  if (btnPlano) btnPlano.addEventListener('click', function () { mostrar('plano'); });

  // Corrigir telefone
  var btnCorrigir = document.getElementById('btn-corrigir-tel');
  var caixaEditar = document.getElementById('tel-editar');
  var inputTel = document.getElementById('tel-input');
  var btnSalvar = document.getElementById('btn-salvar-tel');

  function atualizarTelefone(digitos) {
    dados.telefone = digitos;
    salvarDados(dados);
    document.querySelectorAll('[data-telefone]').forEach(function (el) {
      el.textContent = formatarTelefone(digitos);
    });
  }

  if (btnCorrigir && caixaEditar && inputTel && btnSalvar) {
    btnCorrigir.addEventListener('click', function () {
      caixaEditar.classList.remove('hidden');
      caixaEditar.classList.add('flex');
      inputTel.value = soNumeros(dados.telefone);
      inputTel.focus();
    });
    inputTel.addEventListener('input', function () {
      this.value = soNumeros(this.value);
    });
    btnSalvar.addEventListener('click', function () {
      var d = soNumeros(inputTel.value);
      if (d.length < 10 || d.length > 11) {
        inputTel.focus();
        return;
      }
      atualizarTelefone(d);
      caixaEditar.classList.add('hidden');
      caixaEditar.classList.remove('flex');
    });
  }

  // Telas
  var telas = {
    obrigado: document.getElementById('tela-obrigado'),
    aula: document.getElementById('tela-aula'),
    fim: document.getElementById('tela-fim'),
    plano: document.getElementById('tela-plano'),
  };

  function mostrar(nome) {
    Object.keys(telas).forEach(function (k) {
      telas[k].classList.toggle('ativa', k === nome);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      history.replaceState(null, '', '#' + nome);
    } catch (e) {}
  }

  var hash = (location.hash || '').replace('#', '');
  if (telas[hash] && hash !== 'obrigado') mostrar(hash);
  else if (telas[q.get('tela')] && q.get('tela') !== 'obrigado') mostrar(q.get('tela'));

  var btnAula = document.getElementById('btn-ir-aula');
  if (btnAula && btnAula.tagName === 'A') {
    // Leva para a VSL levando junto as UTMs da URL atual
    try {
      var dest = new URL(btnAula.getAttribute('href'), window.location.origin);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) {
        var v = q.get(k);
        if (v && !dest.searchParams.has(k)) dest.searchParams.set(k, v);
      });
      btnAula.href = dest.toString();
    } catch (e) {}
  } else if (btnAula) {
    btnAula.addEventListener('click', function () {
      mostrar('aula');
    });
  }

  // Player YouTube da aula
  var vsl = document.getElementById('aula-vsl');
  if (!vsl) return;

  var capa = document.getElementById('aula-capa');
  var barra = document.getElementById('aula-progresso');
  var player = null;
  var iniciado = false;
  var testePitch = parseInt(q.get('pitch'), 10);

  window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player('aula-player', {
      host: 'https://www.youtube-nocookie.com',
      videoId: vsl.dataset.video,
      playerVars: {
        autoplay: 0,
        mute: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
      },
      events: {
        onStateChange: function (e) {
          if (e.data === YT.PlayerState.ENDED) {
            iniciado = false;
            capa.classList.remove('hidden');
            mostrar('fim');
          }
        },
      },
    });
  };

  vsl.addEventListener('click', function () {
    if (!player || !player.playVideo) return;
    if (!iniciado) {
      iniciado = true;
      capa.classList.add('hidden');
      player.unMute();
      player.setVolume(100);
      player.playVideo();
      return;
    }
    if (player.getPlayerState() === YT.PlayerState.PLAYING) player.pauseVideo();
    else player.playVideo();
  });

  setInterval(function () {
    if (!iniciado || !player || !player.getDuration) {
      if (barra) barra.style.width = '0%';
      return;
    }
    var duracao = player.getDuration();
    if (!duracao) return;
    var atual = player.getCurrentTime();
    if (testePitch > 0 && atual >= testePitch) {
      player.pauseVideo();
      mostrar('fim');
      iniciado = false;
      return;
    }
    if (barra) barra.style.width = Math.min(100, (atual / duracao) * 100) + '%';
  }, 250);

  var api = document.createElement('script');
  api.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(api);
})();
