const s:is_windows = has('win32') || has('win64')

function ddt#util#print_error(string, name = 'ddt') abort
  echohl Error
  for line in
        \ (a:string->type() ==# v:t_string ? a:string : a:string->string())
        \ ->split("\n")->filter({ _, val -> val != ''})
    echomsg printf('[%s] %s', a:name, line)
  endfor
  echohl None
endfunction
