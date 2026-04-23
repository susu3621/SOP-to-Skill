const builtInTemplateStartMarkers = [
  '如果用户填写了模板链接，则优先采用用户模板；未填写时，默认按以下模板整理：\n',
  '如果用户填写了公司 SOP / 模板链接，则优先采用用户提供的内容；未填写时，默认按以下模板整理：\n',
  'If the user provides a template link, follow the user template first. Otherwise, use this built-in template:\n',
  'If the user provides a template link, follow the user template first. Otherwise, use this built-in structure:\n',
  'If the user provides a company SOP or template link, follow the user-provided content first. Otherwise, use this built-in template:\n',
]

const builtInTemplateEndMarkers = [
  '\n\n输入（每次执行都需要提供给Skill的信息）：',
  '\n\nInput (information required every run):',
  '\n\n运行时输入：',
  '\n\nRuntime input:',
]

export function getBuiltInTemplateValue(description: string) {
  for (const startMarker of builtInTemplateStartMarkers) {
    const startIndex = description.indexOf(startMarker)

    if (startIndex === -1) {
      continue
    }

    const templateStart = startIndex + startMarker.length
    const endIndex = builtInTemplateEndMarkers.reduce<number | undefined>((closest, marker) => {
      const markerIndex = description.indexOf(marker, templateStart)

      if (markerIndex === -1) {
        return closest
      }

      if (closest === undefined || markerIndex < closest) {
        return markerIndex
      }

      return closest
    }, undefined)

    return description.slice(templateStart, endIndex).trim()
  }

  return ''
}

export function isBuiltInTemplateQuestion(questionId: string) {
  return /(template-source|sop(?:-source)?)$/u.test(questionId)
}

export function usesBuiltInTemplateFallback(
  questionId: string,
  answer: string,
  description: string
) {
  return (
    answer.trim().length === 0 &&
    isBuiltInTemplateQuestion(questionId) &&
    getBuiltInTemplateValue(description).length > 0
  )
}
