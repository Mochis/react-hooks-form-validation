import { useState, useEffect, useReducer, useCallback } from 'react';

const ERROR_STATUS = 'error';
const OBJECT_TYPE = 'object';

function useFormValidation(formInitState, formValidationSchema, flows) {
  const [formState, setFormState] = useReducer(reducer, formInitState);
  const [isValidForm, setIsValidForm] = useState(false);

  //if(flows.length > 0) {
  //   const flowsValidation = ;
    const [isValidFlows, setIsValidFlows] = useState([]);
  //}

  function isFlowForm(field) {
    return formValidationSchema[field] && typeof formValidationSchema[field].flow === 'object';
  }

  useEffect(() => {
    setIsValidFlows(flows.map(flow => flow.isValidFlow));
  }, flows.map(flow => flow.isValidFlow));

  function dependOnAnyField(field, fieldSchema) {
    if(typeof(fieldSchema.required) === OBJECT_TYPE) {
      return true;
    }
    return false;
  }

  function isFieldRequired(field, fieldSchema, state) {
    let required = false;
    if(fieldSchema && fieldSchema.required) {
      required = true;
      if(typeof(fieldSchema.required) === OBJECT_TYPE && state){
        let dependOnField = fieldSchema.required.dependOn;
        let dependOnFieldValue = fieldSchema.required.dependOnValue;
        if(state[dependOnField].value !== dependOnFieldValue) {
          required = false;
        }
      }
    }
    return required;
  }

  function getDependentFieldsValues() {
    return Object.keys(formValidationSchema)
      .filter(field => dependOnAnyField(field, formValidationSchema))
      .map(field => formState[formValidationSchema[field].required.dependOn].value);
  }

  function getCheckboxes() {
    return Object.keys(formState)
      .filter(field => formState[field].type === 'checkbox');
  }

  const validateField = useCallback((field, value) => {
    let validField = true;
    let errMsg = '';
    let fieldSchema = formValidationSchema[field];
    let fieldValue = value;
    let required = isFieldRequired(field, fieldSchema, formState);
    if(required && !fieldValue) {
      errMsg = 'Required field';
      validField = false;
    } else {
      if(fieldSchema.regex && !fieldSchema.regex.test(fieldValue)) {
        errMsg = fieldSchema.msg;
        validField = false;
      }
    }
    return { validField, errMsg };
  }, [formValidationSchema, getDependentFieldsValues()]);

  const onChangeEvent = useCallback((field, value, callback) => {
    const { validField, errMsg } = validateField(field, value);

    if(!validField && formState[field].status === null) {
      setFormState({ type: 'valueStatusMsg', value, field, status: ERROR_STATUS, msg: errMsg });
    } else if(!validField && formState[field].status === 'ok') {
      setFormState({ type: 'valueStatusMsg', value, field, status: ERROR_STATUS, msg: errMsg });
    } else if(validField && formState[field].status === ERROR_STATUS) {
      setFormState({ type: 'valueStatusMsg', value, field, status: 'ok', msg: '' });
    } else if(callback){
      const callbackResponse = callback(value);
      if(callbackResponse) {
        const { callbackField, callbackValue } = callback(value);
        setFormState({ type: 'valueStatus', field: callbackField, value: callbackValue, status:'ok'});
      }
    } else {
      setFormState({ type: 'valueStatus', field, value, status:'ok'});
    }
    return { validField, errMsg };
  }, [formValidationSchema, getDependentFieldsValues()]);

  const onChangeCheckbox = useCallback((field, value, callback) => {
    //const value = formState[field].value;
    const callbackResponse = callback(value);
    if(callbackResponse) {
      const {callbackField, callbackValue} = callbackResponse;
      setFormState({ type: 'valueStatus', field: callbackField, value: callbackValue, status:'ok'});
    }
    setFormState({ type: 'value', field, value });
  }, [Object.keys(formState)
    .map(key => formState[key].value)]);

  const resetFormState = useCallback(() => {
    setFormState({ type: 'initState', initState: formInitState });
  }, [formInitState]);

  const resetField = useCallback((field) => {
    const value = formInitState[field]; // value is the whole object
    setFormState({ type: 'field', field, value});
  }, []);

  // useEffect(() => {
  //   const isValidForm = !Object.keys(formState)
  //     .some(field => {
  //       const isRequired = isFieldRequired(field, formValidationSchema[field], formState);
  //       return formState[field].status === ERROR_STATUS ||
  //         (isRequired && !formState[field].value);
  //     });
  //   setIsValidForm(isValidForm);
  // }, [formState, formValidationSchema]);



  useEffect(() => {
    const isValidForm = !isValidFlows.some(isValidFlow => !isValidFlow)
      && !Object.keys(formState)
        .some(field => {
          const isFlow = isFlowForm(field);
          let isRequired = false;
          if(!isFlow) {
            isRequired = isFieldRequired(field, formValidationSchema[field], formState);
          } else { // isFlow true
            if(isValidFlows.length === 0) {
              isRequired = formValidationSchema[field].required;
            } else {
              return false;
            }
          }
          return formState[field].status === ERROR_STATUS ||
            (isRequired && (formState[field].status !== 'ok'));
        });
    setIsValidForm(isValidForm);
  }, [Object.keys(formState)
    .map(key => formState[key].status)
    .filter(status => status !== null)].concat(isValidFlows));

  return { isValidForm, formState, setFormState, onChangeEvent, onChangeCheckbox,
    resetFormState, resetField };
}

function reducer(prevState, action) {
  const { type, field, value, status, msg } = action;
  switch (type) {
    case 'value':
      return ({...prevState,
        [field]:{...prevState[field], value}});
    case 'status':
      return ({...prevState,
        [field]:{...prevState[field], status}});
    case 'field':
      return ({...prevState,
        [field]: value});
    case 'statusMsg':
      return ({...prevState,
        [field]:{...prevState[field], status, msg}});
    case 'valueStatus':
      return ({...prevState,
        [field]:{...prevState[field], value, status}});
    case 'valueStatusMsg':
      return ({...prevState,
        [field]:{...prevState[field], value, status, msg}});
    case 'valueAndValueStatus':
      return ({...prevState,
        [action.field1]:{...prevState[action.field1], value: action.value1},
        [action.field2]:{...prevState[action.field2],
          value: action.value2,
          status: action.status2 !== undefined ? action.status2 : prevState[action.field2].status}});
    case 'initState':
      return action.initState;
    default:
      throw new Error();
  }
}

export default useFormValidation;
