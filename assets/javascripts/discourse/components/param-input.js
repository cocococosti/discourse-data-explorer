import Component from "@ember/component";
import I18n from "I18n";
import discourseComputed from "discourse-common/utils/decorators";
import Category from "discourse/models/category";
import { dasherize } from "@ember/string";
import { isEmpty } from "@ember/utils";
import { computed } from "@ember/object";

const layoutMap = {
  int: "int",
  bigint: "int",
  boolean: "boolean",
  string: "generic",
  time: "generic",
  date: "generic",
  datetime: "generic",
  double: "string",
  user_id: "user_id",
  post_id: "string",
  topic_id: "generic",
  category_id: "generic",
  group_id: "generic",
  badge_id: "generic",
  int_list: "generic",
  string_list: "generic",
  user_list: "user_list",
};

function allowsInputTypeTime() {
  try {
    const inp = document.createElement("input");
    inp.attributes.type = "time";
    inp.attributes.type = "date";
    return true;
  } catch (e) {
    return false;
  }
}

export default Component.extend({
  classNameBindings: ["valid:valid:invalid", ":param"],

  boolTypes: [
    { name: I18n.t("explorer.types.bool.true"), id: "Y" },
    { name: I18n.t("explorer.types.bool.false"), id: "N" },
    { name: I18n.t("explorer.types.bool.null_"), id: "#null" },
  ],
  initialValues: null,

  init() {
    this._super(...arguments);

    if (this.initialValues && this.info.identifier in this.initialValues) {
      this.set("value", this.initialValues[this.info.identifier]);
    }
  },

  value: computed("params", "info.identifier", {
    get() {
      return this.params[this.get("info.identifier")];
    },
    set(key, value) {
      this.params[this.get("info.identifier")] = value?.toString();
      return value;
    },
  }),

  valueBool: computed("params", "info.identifier", {
    get() {
      return this.params[this.get("info.identifier")] !== "false";
    },
    set(key, value) {
      value = !!value;
      this.params[this.get("info.identifier")] = value.toString();
      return value;
    },
  }),

  @discourseComputed("value", "info.type", "info.nullable")
  valid(value, type, nullable) {
    if (isEmpty(value)) {
      return nullable;
    }

    const intVal = parseInt(value, 10);
    const intValid =
      !isNaN(intVal) && intVal < 2147483648 && intVal > -2147483649;
    const isPositiveInt = /^\d+$/.test(value);
    switch (type) {
      case "int":
        return /^-?\d+$/.test(value) && intValid;
      case "bigint":
        return /^-?\d+$/.test(value) && !isNaN(intVal);
      case "boolean":
        return /^Y|N|#null|true|false/.test(value);
      case "double":
        return (
          !isNaN(parseFloat(value)) ||
          /^(-?)Inf(inity)?$/i.test(value) ||
          /^(-?)NaN$/i.test(value)
        );
      case "int_list":
        return value.split(",").every((i) => /^(-?\d+|null)$/.test(i.trim()));
      case "post_id":
        return isPositiveInt || /\d+\/\d+(\?u=.*)?$/.test(value);
      case "category_id":
        if (!isPositiveInt && value !== dasherize(value)) {
          this.set("value", dasherize(value));
        }

        if (isPositiveInt) {
          return !!this.site.categories.find((c) => c.id === intVal);
        } else if (/\//.test(value)) {
          const match = /(.*)\/(.*)/.exec(value);
          if (!match) {
            return false;
          }
          const result = Category.findBySlug(
            dasherize(match[2]),
            dasherize(match[1])
          );
          return !!result;
        } else {
          return !!Category.findBySlug(dasherize(value));
        }
      case "group_id":
        const groups = this.site.get("groups");
        if (isPositiveInt) {
          return !!groups.find((g) => g.id === intVal);
        } else {
          return !!groups.find((g) => g.name === value);
        }
    }
    return true;
  },

  @discourseComputed("info.type")
  layoutType(type) {
    if ((type === "time" || type === "date") && !allowsInputTypeTime()) {
      return "string";
    }
    if (layoutMap[type]) {
      return layoutMap[type];
    }
    return "generic";
  },

  @discourseComputed("layoutType")
  layoutName(layoutType) {
    return `admin/components/q-params/${layoutType}`;
  },
});
