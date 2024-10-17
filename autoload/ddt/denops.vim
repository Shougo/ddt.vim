function ddt#denops#_denops_running() abort
  return 'g:loaded_denops'->exists()
        \ && denops#server#status() ==# 'running'
        \ && denops#plugin#is_loaded('ddt')
endfunction

function ddt#denops#_request(method, args) abort
  if s:init()
    return {}
  endif

  if denops#server#status() !=# 'running'
    " Lazy call request
    execute printf('autocmd User DenopsPluginPost:ddt call '
          \ .. 's:notify("%s", %s)', a:method, a:args->string())
    return {}
  endif

  if denops#plugin#wait('ddt')
    return {}
  endif
  return denops#request('ddt', a:method, a:args)
endfunction
function ddt#denops#_notify(method, args) abort
  if s:init()
    return {}
  endif

  if !ddt#denops#_denops_running()
    " Lazy call notify
    execute printf('autocmd User DenopsPluginPost:ddt call '
          \ .. 's:notify("%s", %s)', a:method, a:args->string())
    return {}
  endif

  return s:notify(a:method, a:args)
endfunction

function s:init() abort
  if 's:initialized'->exists()
    return
  endif

  if !has('patch-9.0.1276') && !has('nvim-0.10')
    call ddt#util#_error('ddt.vim requires Vim 9.0.1276+ or NeoVim 0.10+.')
    return 1
  endif

  augroup ddt
    autocmd!
    autocmd User DenopsPluginPost:ddt ++nested let s:initialized = v:true
  augroup END

  " NOTE: denops load may be started
  if 'g:loaded_denops'->exists()
    if denops#server#status() ==# 'running'
      call s:register()
      return
    endif

    try
      if '<amatch>'->expand() ==# 'DenopsReady'
        call s:register()
        return
      endif
    catch /^Vim\%((\a\+)\)\=:E497:/
      " NOTE: E497 is occured when it is not in autocmd.
    endtry
  endif

  autocmd ddt User DenopsReady ++nested call s:register()
endfunction

function s:notify(method, args) abort
  if 'ddt'->denops#plugin#is_loaded()
    call denops#notify('ddt', a:method, a:args)
  else
    call denops#plugin#wait_async('ddt',
          \ { -> denops#notify('ddt', a:method, a:args) })
  endif
endfunction

const s:root_dir = '<sfile>'->expand()->fnamemodify(':h:h:h')
const s:sep = has('win32') ? '\' : '/'
function s:register() abort
  call denops#plugin#load(
        \   'ddt',
        \   [s:root_dir, 'denops', 'ddt', 'app.ts']->join(s:sep)
        \ )

  autocmd ddt User DenopsClosed ++nested call s:stopped()
endfunction
function s:stopped() abort
  unlet! s:initialized
endfunction
