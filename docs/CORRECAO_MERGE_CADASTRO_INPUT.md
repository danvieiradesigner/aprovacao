# Correção do nó Merge Cadastro Input

## Erros que ocorrem

1. **`'data' expects an object but we got array`** – O campo `data` está como tipo `Object`, mas a API `get-lists-data` retorna um array.
2. **`cadastro_state` undefined** – Quando a chave ainda não existe no Redis, `$json.value` fica undefined.

## Correções a aplicar manualmente no n8n

Abra o workflow **Classificador - Fluxo Concreto** no editor do n8n e edite o nó **Merge Cadastro Input**:

### 1. Campo `data`

**Opção A – Trocar tipo para Array (se o n8n suportar):**
- Nome: `data`
- Valor: `{{ $('Fetch Bases for Cadastro').item.json.data || [] }}`
- Tipo: **Array** (em vez de Object)

**Opção B – Se Array não existir, usar objeto com fallback:**
- Nome: `data`
- Valor: `{{ Array.isArray($('Fetch Bases for Cadastro').item.json.data) ? $('Fetch Bases for Cadastro').item.json.data : [] }}`
- Tipo: **Object** (e adicionar `options: { ignoreConversionErrors: true }` se existir)

**Opção C – Usar nó Code em vez de Set:**

Substitua o nó Merge Cadastro Input por um nó **Code** com este conteúdo:

```javascript
const fetchBases = $('Fetch Bases for Cadastro').first().json;
const getState = $input.first().json;

const data = Array.isArray(fetchBases.data) ? fetchBases.data : [];
const cadastro_state = getState.value || getState.propertyName || '';

return [{
  json: {
    data,
    cadastro_state
  }
}];
```

### 2. Campo `cadastro_state`

- Nome: `cadastro_state`
- Valor: `{{ $json.value || $json.propertyName || '' }}`
- Tipo: **String**

---

## Resumo rápido

No nó **Merge Cadastro Input** (Set):

| Campo           | Valor antigo      | Valor novo                                      |
|-----------------|-------------------|--------------------------------------------------|
| `data`          | `{{ $('Fetch Bases for Cadastro').item.json.data }}` | `{{ $('Fetch Bases for Cadastro').item.json.data \|\| [] }}` |
| `data` (tipo)   | object            | **array** (se disponível) |
| `cadastro_state`| `{{ $json.value }}` | `{{ $json.value \|\| $json.propertyName \|\| '' }}` |

## Se o erro persistir

Se o nó Set não aceitar tipo `array`, use a **Opção C** (substituir por nó Code) acima.
