var TemplateHandler = function(templates) {
  this.templates = templates;
  this.template_file_content = {};
  this.current_template = null;
  this.numberOfTemplates = 0;
  // Get templates count
  for(var name in this.templates) {
    this.numberOfTemplates = this.numberOfTemplates + 1;
  }
}

TemplateHandler.prototype.start = function(callback) {  
  var counter = this.numberOfTemplates;
  var self = this;

  for(var name in this.templates) {
    // Execute each get in it's own context
    var wrapper_function = function(template_name, template_location) {
      // Load the initial mustache
      $.get(self.templates[name], function(template) {
        counter = counter - 1;
        console.log("loaded template: " + template_name + " at " + template_location);

        self.template_file_content[template_name] = template;
        if(counter == 0) callback();
      })
    }

    wrapper_function(name, this.templates[name])
  }
}

TemplateHandler.prototype.setTemplate = function(id, template_name, context) {  
  var container = $(id);
  if(container == null || container.html == null) throw new Error("no container " + id);
  if(this.template_file_content[template_name] == null) throw new Error("no template name " + template_name + " loaded");
  // Ensure at least empty context
  context = context == null ? {} : context;
  // Save current template
  this.current_template = template_name;
  // Render template
  var rendered_template = Mustache.render(this.template_file_content[template_name], context);
  // No error render the template
  container.html(rendered_template);
}

TemplateHandler.prototype.isTemplate = function(template_name) {
  return this.current_template == template_name;  
}

TemplateHandler.prototype.render = function(template_name, context) {
  // Ensure at least empty context
  context = context == null ? {} : context;
  // Render template
  return Mustache.render(this.template_file_content[template_name], context);
}