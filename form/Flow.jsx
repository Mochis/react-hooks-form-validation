import { useState, useCallback, useReducer, useEffect } from 'react';
import useFormValidation from './Form.jsx';

// Presuponemos que formInitState solo contiene los field del flow y formValidationSchema también
function useFlow(flowInitState, flowSchema, formInitState, formValidationSchema) {
  const [flowState, setFlowState] = useReducer(reducer, flowInitState);
  const [isValidFlow, setIsValidFlow] = useState(false);

  const { isValidForm, formState, onChangeEvent, resetField } =
    useFormValidation(formInitState, formValidationSchema, []);

  const onChangeFlowEvent = useCallback((field, value) => {
    const { validField } = onChangeEvent(field, value);
    const level = formValidationSchema[field].flow.level;
    if(!validField) {
      const status = 'error';
      setFlowState({type: 'changeStatus', level, status});
    } else {
      // check if we can set OK the level
      const isLevelOk = getFlowLevelFields(level, formValidationSchema)
        .some(field => formState[field].status !== 'ok');
      const status = 'ok';
      if(isLevelOk) {
        setFlowState({type: 'changeStatus', level, status});
      }
    }
  }, [Object.keys(formState)
    .map(key => formState[key].status)
    .filter(status => status !== null)]);

  useEffect(() => {
    // mirar por nivel si esta ok para habilitar o deshabilitar niveles y
    // resetear niveles desde el que está mal hacia abajo
    // Primer nivel siempre enabled

    //Miramos nivel por nivel de los habilitados desde el 1 hasta que se encuentra error
    const levelWithError = flowState.levels
      .find(level => {
        if(level.status === 'error') return level.level;
      });

    // hay error y el error no estaba ya?
    // si hay error, reseteamos desde el siguiente al que está mal hacia abajo
    // hasta que no haya nivles o encontremos uno deshabilitado
    if(levelWithError) {
      const levelsToDisable = flowSchema.levels.filter(level => level > levelWithError.level);
      setFlowState({ type:'disableMultiple', level: levelsToDisable });
      levelsToDisable.forEach(level => {
          // reseteamos todos los campos que pertenezcan a ese nivel
          getFlowLevelFields(level, formValidationSchema)
            .forEach(field => resetField(field)); // multiple formState changes
        });
    } else {
      // si no hay error, habilitamos siguiente nivel si:
      // - ultimo nivel habilitado esta OK y si hay siguiente nivel
      const lastIndexFlowLevelEnabled = flowState.levels
        .map(flowState => flowState.enabled).lastIndexOf(true);
      const lastFlowEnabledIsOk =
        flowState.levels[lastIndexFlowLevelEnabled].status === 'ok';
      const nextFlowLevel = flowState.levels[lastIndexFlowLevelEnabled + 1];
      const nextFlowLevelIsDisabled = nextFlowLevel && !nextFlowLevel.enabled;
      // Ultimo habilitado esta OK y hay siguiente y esta deshabilitado
      if(nextFlowLevelIsDisabled && lastFlowEnabledIsOk) {
        setFlowState({type: 'changeEnabled',
          level: nextFlowLevel.level, value: true});
      }
    }

    // depends on flow level status values
  }, flowState.levels.map(level => level.status));

  // podría usar useMemo si se repite mucho esto
  function getFlowLevelFields(level, formValidationSchema) {
    return Object.keys(formValidationSchema)
      .filter(field => formValidationSchema[field].flow.level === level);
  }

  useEffect(() => {
    const isValidFlow = isValidForm;
    setIsValidFlow(isValidFlow);
  }, [isValidForm]);

  return { isValidFlow, flowState, onChangeFlowEvent, flowFormState:formState };
}

function reducer(prevState, action) {
  const { type, level, value, status } = action;
  switch (type) {
    case 'changeEnabled':
      return ({...prevState, levels: prevState.levels
          .map(levelObj => levelObj.level === level ?
            {...levelObj, enabled: value} : levelObj)});
    case 'changeStatus':
      return ({...prevState, levels: prevState.levels
          .map(levelObj => levelObj.level === level ?
            {...levelObj, status} : levelObj)});
    case 'disableMultiple':
      if(Array.isArray(level)) {
        return ({...prevState, levels: prevState.levels
            .map(levelObj => level.includes(levelObj.level) ?
              {...levelObj,
                enabled: false, status: null} : levelObj)});
      }
      throw new Error();
    default:
      throw new Error();
  }
}

export default useFlow;

