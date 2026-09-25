"""Utility for detecting and validating Prompt System variables from instructions."""
import re
from typing import Any, Dict, List, Optional

# Regex pattern matching valid variable placeholders like {variable_name}
VARIABLE_PATTERN = re.compile(r"\{([a-zA-Z0-9_]+)\}")


def extract_variables(text: Optional[str]) -> List[str]:
    """Detect variables referenced in prompt instructions using {variable_name} syntax.
    
    Requirements:
    - Detect variables using curly braces.
    - Return unique variable names.
    - Preserve order of first appearance.
    - Do not duplicate variables.
    """
    if not text:
        return []

    matches = VARIABLE_PATTERN.findall(text)
    seen = set()
    result = []
    for var in matches:
        if var not in seen:
            seen.add(var)
            result.append(var)

    return result


def validate_prompt_variables(
    instructions: Optional[str],
    configured_variables: Optional[Any],
) -> Dict[str, Any]:
    """Validate configured variables against variables actually used in instructions.
    
    Returns a dict with:
    - valid: bool (true only when configured exactly matches detected)
    - detected_variables: list of variable names extracted from instructions
    - configured_variables: list of variable names configured on the prompt system
    - missing_variables: variables used in instructions but missing from configuration
    - unused_variables: variables configured but never referenced in instructions
    """
    detected_variables = extract_variables(instructions)

    configured_names = []
    seen = set()

    # Extract items whether configured_variables is a list, dict, or single item
    items_to_process = []
    if configured_variables:
        if isinstance(configured_variables, dict):
            if "variables" in configured_variables and isinstance(configured_variables["variables"], (list, dict)):
                raw_vars = configured_variables["variables"]
                items_to_process = raw_vars if isinstance(raw_vars, list) else list(raw_vars.values())
            elif "name" in configured_variables and isinstance(configured_variables["name"], str):
                items_to_process = [configured_variables]
            else:
                # Could be mapping like {"topic": {...}} or {"topic": "text"}
                items_to_process = [
                    v if (isinstance(v, dict) and "name" in v) else k
                    for k, v in configured_variables.items()
                ]
        elif isinstance(configured_variables, (list, tuple, set)):
            items_to_process = list(configured_variables)
        elif isinstance(configured_variables, str):
            items_to_process = [configured_variables]

    for item in items_to_process:
        name = None
        if isinstance(item, dict) and "name" in item:
            name = str(item["name"]).strip()
        elif hasattr(item, "name"):
            name = str(getattr(item, "name")).strip()
        elif isinstance(item, str):
            name = item.strip()

        if name and name not in seen:
            seen.add(name)
            configured_names.append(name)

    missing_variables = [var for var in detected_variables if var not in seen]
    unused_variables = [var for var in configured_names if var not in detected_variables]
    is_valid = len(missing_variables) == 0 and len(unused_variables) == 0

    return {
        "valid": is_valid,
        "detected_variables": detected_variables,
        "configured_variables": configured_names,
        "missing_variables": missing_variables,
        "unused_variables": unused_variables,
    }
