function ddt#start(options = {}) abort
  return ddt#denops#_notify('start', [a:options])
endfunction

function ddt#ui_action(name, action, params = {}) abort
  if a:name ==# ''
    return
  endif
  call ddt#denops#_notify('uiAction', [a:name, a:action, a:params])
endfunction

function ddt#get_input(name) abort
  if a:name ==# ''
    return ''
  endif
  return ddt#denops#_request('getInput', [a:name])
endfunction
