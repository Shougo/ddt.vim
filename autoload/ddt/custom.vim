function ddt#custom#patch_global(key_or_dict, value = '') abort
  const dict = s:normalize_key_or_dict(a:key_or_dict, a:value)
  call s:notify('patchGlobal', [dict])
endfunction
function ddt#custom#patch_local(name, key_or_dict, value = '') abort
  const dict = s:normalize_key_or_dict(a:key_or_dict, a:value)
  call s:notify('patchLocal', [dict, a:name])
endfunction

function ddt#custom#set_global(dict) abort
  call s:notify('setGlobal', [a:dict])
endfunction
function ddt#custom#set_local(name, dict) abort
  call s:notify('setLocal', [a:dict, a:name])
endfunction

function ddt#custom#load_config(path) abort
  if !a:path->filereadable()
    call ddt#util#print_error(printf('"%s" is not found.', a:path))
    return
  endif

  return ddt#denops#_request('loadConfig', [a:path])
endfunction

function s:normalize_key_or_dict(key_or_dict, value) abort
  if a:key_or_dict->type() == v:t_dict
    return a:key_or_dict
  elseif a:key_or_dict->type() == v:t_string
    let base = {}
    let base[a:key_or_dict] = a:value
    return base
  endif
  return {}
endfunction

function s:normalize_string_or_list(string_or_list) abort
  if a:string_or_list->type() == v:t_list
    return a:string_or_list
  elseif a:string_or_list->type() == v:t_string
    return [a:string_or_list]
  endif
  return []
endfunction

function s:notify(method, args) abort
  " Save args
  if !'g:ddt#_notifies'->exists()
    let g:ddt#_notifies = []
  endif
  call add(g:ddt#_notifies, #{ method: a:method, args: a:args })

  return ddt#denops#_notify(a:method, a:args)
endfunction
